/* Lector PDF Voz: biblioteca pública alojada junto a la aplicación. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const libraryEl = $("library");
  const statusEl = $("status");
  const readerStatus = $("readerStatus");
  const textPreview = $("textPreview");
  const titleEl = $("documentTitle");
  const infoEl = $("documentInfo");
  const voiceSelect = $("voiceSelect");
  const speedInput = $("speed");
  const speedLabel = $("speedLabel");

  let books = [];
  let pdfDoc = null;
  let currentBook = null;
  let pageNumber = 1;
  let pageTexts = [];
  let currentUtterance = null;
  let speechToken = 0;
  let currentChunkIndex = 0;
  let chunks = [];

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  function setReaderStatus(message) { readerStatus.textContent = message; }
  function setReaderButtons(enabled) {
    ["playBtn","pauseBtn","resumeBtn","stopBtn","prevPageBtn","nextPageBtn"].forEach(id => $(id).disabled = !enabled);
  }

  function safeUrl(path) {
    // Restrict the catalogue to PDFs in this site's own pdfs/ directory.
    if (typeof path !== "string" || !path.startsWith("pdfs/") || path.includes("..") || !path.toLowerCase().endsWith(".pdf")) return null;
    return new URL(path, document.baseURI).href;
  }

  async function loadLibrary() {
    statusEl.textContent = "Cargando biblioteca…";
    libraryEl.replaceChildren();
    try {
      const response = await fetch("./biblioteca.json", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo leer biblioteca.json (HTTP " + response.status + ").");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("El catálogo debe ser una lista JSON.");
      books = data.filter(book => book && typeof book.title === "string" && safeUrl(book.file));
      if (!books.length) {
        statusEl.textContent = "La biblioteca está vacía. Agrega archivos PDF a la carpeta pdfs y registra cada uno en biblioteca.json.";
        return;
      }
      statusEl.textContent = `Hay ${books.length} documento(s) en la biblioteca.`;
      books.forEach((book, index) => {
        const card = document.createElement("div");
        card.className = "book";
        const title = document.createElement("h3");
        title.textContent = book.title;
        const description = document.createElement("p");
        description.textContent = book.description || book.file;
        const button = document.createElement("button");
        button.className = "button primary";
        button.type = "button";
        button.textContent = "Abrir y preparar lectura";
        button.addEventListener("click", () => openBook(index));
        card.append(title, description, button);
        libraryEl.append(card);
      });
    } catch (error) {
      statusEl.textContent = "Error al cargar la biblioteca: " + error.message;
    }
  }

  async function openBook(index) {
    const book = books[index];
    const url = safeUrl(book && book.file);
    if (!url) { setReaderStatus("La ruta del PDF no es válida."); return; }
    stopSpeech();
    currentBook = book;
    pdfDoc = null;
    pageTexts = [];
    pageNumber = 1;
    titleEl.textContent = book.title;
    infoEl.textContent = "Descargando y leyendo el PDF…";
    textPreview.textContent = "Cargando documento…";
    setReaderStatus("Descargando el PDF desde internet. Espera un momento…");
    setReaderButtons(false);
    try {
      if (!window.pdfjsLib) throw new Error("No se pudo cargar PDF.js. Comprueba tu conexión a internet.");
      const loadingTask = pdfjsLib.getDocument({ url });
      pdfDoc = await loadingTask.promise;
      infoEl.textContent = `${pdfDoc.numPages} página(s)`;
      pageTexts = new Array(pdfDoc.numPages);
      await showPage(1);
      setReaderButtons(true);
      $("prevPageBtn").disabled = true;
      $("nextPageBtn").disabled = pdfDoc.numPages <= 1;
      setReaderStatus("Documento listo. Pulsa «Leer» para escuchar la página actual.");
    } catch (error) {
      pdfDoc = null;
      textPreview.textContent = "No se pudo abrir el PDF.\n\n" + error.message +
        "\n\nComprueba que el nombre y la ruta estén bien escritos en biblioteca.json, que el archivo esté en la carpeta pdfs y que sea un PDF con acceso público.";
      setReaderStatus("No se pudo abrir el documento.");
      setReaderButtons(false);
    }
  }

  async function extractPage(number) {
    if (pageTexts[number - 1] !== undefined) return pageTexts[number - 1];
    const page = await pdfDoc.getPage(number);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str || "").join(" ").replace(/[ \t]+/g, " ").trim();
    pageTexts[number - 1] = text;
    return text;
  }

  async function showPage(number) {
    if (!pdfDoc || number < 1 || number > pdfDoc.numPages) return;
    pageNumber = number;
    const text = await extractPage(number);
    textPreview.textContent = text || "No se encontró texto seleccionable en esta página. Si el PDF es un escaneo o una imagen, esta versión no incluye OCR.";
    $("pageLabel").textContent = `Página ${number} de ${pdfDoc.numPages}`;
    $("prevPageBtn").disabled = number <= 1;
    $("nextPageBtn").disabled = number >= pdfDoc.numPages;
    setReaderStatus(text ? `Página ${number} lista para leer.` : `La página ${number} no contiene texto extraíble.`);
  }

  function splitIntoChunks(text, maxLength = 220) {
    const words = text.split(/\s+/).filter(Boolean);
    const result = [];
    let part = "";
    for (const word of words) {
      if ((part + " " + word).trim().length > maxLength && part) {
        result.push(part);
        part = word;
      } else part = (part + " " + word).trim();
    }
    if (part) result.push(part);
    return result;
  }

  function getSelectedVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.voiceURI === voiceSelect.value) || null;
  }

  function stopSpeech() {
    speechToken++;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    currentUtterance = null;
    chunks = [];
    currentChunkIndex = 0;
  }

  function speakNext(token) {
    if (token !== speechToken || currentChunkIndex >= chunks.length) {
      if (token === speechToken) setReaderStatus("Lectura terminada.");
      return;
    }
    currentUtterance = new SpeechSynthesisUtterance(chunks[currentChunkIndex]);
    const voice = getSelectedVoice();
    if (voice) currentUtterance.voice = voice;
    currentUtterance.lang = voice?.lang || "es-ES";
    currentUtterance.rate = Number(speedInput.value);
    currentUtterance.onend = () => {
      if (token !== speechToken) return;
      currentChunkIndex++;
      speakNext(token);
    };
    currentUtterance.onerror = event => {
      if (token !== speechToken || event.error === "canceled" || event.error === "interrupted") return;
      setReaderStatus("La voz no pudo continuar. Intenta seleccionar otra voz.");
    };
    speechSynthesis.speak(currentUtterance);
  }

  async function playPage() {
    if (!pdfDoc) { setReaderStatus("Primero selecciona un documento."); return; }
    if (!("speechSynthesis" in window)) {
      setReaderStatus("Este navegador no admite lectura en voz alta."); return;
    }
    const text = await extractPage(pageNumber);
    if (!text) { setReaderStatus("Esta página no contiene texto seleccionable."); return; }
    stopSpeech();
    chunks = splitIntoChunks(text);
    currentChunkIndex = 0;
    const token = speechToken;
    setReaderStatus(`Leyendo página ${pageNumber}…`);
    speakNext(token);
  }

  function populateVoices() {
    if (!("speechSynthesis" in window)) return;
    const old = voiceSelect.value;
    const voices = speechSynthesis.getVoices();
    voiceSelect.replaceChildren();
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Voz predeterminada del dispositivo";
    voiceSelect.append(defaultOption);
    const spanish = voices.filter(v => /^es([_-]|$)/i.test(v.lang));
    // Put Spanish voices that appear to be female higher in the list, but the browser does not reliably expose gender.
    spanish.sort((a,b) => Number(/female|mujer|sabina|helena|lucia|monica|paulina|zira/i.test(b.name)) -
                          Number(/female|mujer|sabina|helena|lucia|monica|paulina|zira/i.test(a.name)));
    spanish.forEach(voice => {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.append(option);
    });
    if ([...voiceSelect.options].some(o => o.value === old)) voiceSelect.value = old;
  }

  $("refreshBtn").addEventListener("click", loadLibrary);
  $("playBtn").addEventListener("click", playPage);
  $("pauseBtn").addEventListener("click", () => {
    if ("speechSynthesis" in window) { speechSynthesis.pause(); setReaderStatus("Lectura pausada."); }
  });
  $("resumeBtn").addEventListener("click", () => {
    if ("speechSynthesis" in window) { speechSynthesis.resume(); setReaderStatus("Continuando lectura…"); }
  });
  $("stopBtn").addEventListener("click", () => { stopSpeech(); setReaderStatus("Lectura detenida."); });
  $("prevPageBtn").addEventListener("click", () => { stopSpeech(); showPage(pageNumber - 1); });
  $("nextPageBtn").addEventListener("click", () => { stopSpeech(); showPage(pageNumber + 1); });
  speedInput.addEventListener("input", () => { speedLabel.textContent = Number(speedInput.value).toFixed(1) + "×"; });
  if ("speechSynthesis" in window) {
    populateVoices();
    speechSynthesis.addEventListener("voiceschanged", populateVoices);
  } else {
    setReaderStatus("Este navegador no admite lectura en voz alta.");
  }

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
  loadLibrary();
})();
