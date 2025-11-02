const DEFAULT_CENTER_HEIGHT_INCHES = 60; // 5 feet

const frameInchesInput = document.getElementById("frame-inches");
const anchorInput = document.getElementById("anchor-inches");
const centerInchesInput = document.getElementById("center-inches");
const resultValue = document.getElementById("result-primary");
const resultSecondary = document.getElementById("result-secondary");
const frameVisual = document.getElementById("frame-visual");
const topLabel = document.getElementById("top-label");
const bottomLabel = document.getElementById("bottom-label");
const centerLabel = document.getElementById("center-label");
const anchorLabel = document.getElementById("anchor-label");
const nailMark = document.getElementById("nail-mark");
const nailLabel = document.getElementById("nail-label");
const nailWire = document.getElementById("nail-wire");
const defaultSecondaryMessage = resultSecondary.textContent;
const presetForm = document.getElementById("preset-form");
const presetIdInput = document.getElementById("preset-id");
const presetNameInput = document.getElementById("preset-name");
const presetList = document.getElementById("preset-list");
const presetEmptyState = document.getElementById("preset-empty");
const presetNewButton = document.getElementById("preset-new");
const presetsCard = document.querySelector(".presets-card");

const PRESET_STORAGE_KEY = "picture-hanger-presets";
let presets = [];
let activePresetId = null;

resultValue.classList.add("is-placeholder");

function cleanMeasurementString(raw) {
  return raw
    .replace(/["'”″′in]+$/gi, "")
    .replace(/[,]/g, "")
    .trim();
}

function parseFractionPart(part) {
  const match = part.match(/^([+-])?(\d+)\/(\d+)$/);
  if (!match) {
    return null;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const numerator = Number(match[2]);
  const denominator = Number(match[3]);
  if (denominator === 0) {
    return NaN;
  }
  return sign * (numerator / denominator);
}

function parseMeasurement(rawValue) {
  if (!rawValue) {
    return NaN;
  }

  const cleaned = cleanMeasurementString(rawValue);
  if (cleaned === "") {
    return NaN;
  }

  const mixedMatch = cleaned.match(/^([+-]?\d+)\s+(\d+\/\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const fractionPart = parseFractionPart(mixedMatch[2]);
    if (Number.isNaN(fractionPart) || fractionPart === null) {
      return NaN;
    }
    const direction = whole < 0 ? -1 : 1;
    const fractionSign = Math.sign(fractionPart || 1);
    return whole + direction * Math.abs(fractionPart) * fractionSign;
  }

  const fractionOnly = parseFractionPart(cleaned);
  if (fractionOnly !== null) {
    return fractionOnly;
  }

  const numeric = Number(cleaned);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return NaN;
}

function parseInputs() {
  const frameHeight = parseMeasurement(frameInchesInput.value);
  const anchor = parseMeasurement(anchorInput.value);
  const centerRaw = centerInchesInput.value;

  if (Number.isNaN(frameHeight)) {
    return {
      error: "Enter the frame height in inches (you can use decimals or fractions like 30 1/2).",
    };
  }

  if (frameHeight <= 0) {
    return { error: "Frame height must be greater than zero." };
  }

  if (Number.isNaN(anchor)) {
    return {
      error: "Enter the anchor distance in inches (decimals or fractions are OK).",
    };
  }

  if (anchor < 0) {
    return { error: "Anchor distance can’t be negative." };
  }

  if (anchor > frameHeight) {
    return { error: "Anchor distance can’t be greater than the frame height." };
  }

  let centerHeight;
  if (centerRaw.trim() === "") {
    centerHeight = DEFAULT_CENTER_HEIGHT_INCHES;
  } else {
    centerHeight = parseMeasurement(centerRaw);
    if (Number.isNaN(centerHeight)) {
      return {
        error: "Enter the target center height in inches (decimals or fractions are OK).",
      };
    }
  }

  if (centerHeight <= 0) {
    return { error: "Target center height must be greater than zero." };
  }

  return { frameHeight, anchor, centerHeight };
}

function reduceFraction(numerator, denominator) {
  if (numerator === 0) {
    return [0, 1];
  }

  let a = Math.abs(numerator);
  let b = denominator;
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return [numerator / a, denominator / a];
}

function formatInches(value) {
  const sign = value < 0 ? "-" : "";
  const inches = Math.abs(value);
  let whole = Math.floor(inches);
  const remainder = inches - whole;
  const denominator = 16;
  let numerator = Math.round(remainder * denominator);

  if (numerator === denominator) {
    whole += 1;
    numerator = 0;
  }

  let output = sign;
  if (whole > 0 || numerator === 0) {
    output += `${whole}`;
  }

  if (numerator !== 0) {
    const [reducedNumerator, reducedDenominator] = reduceFraction(numerator, denominator);
    output += `${whole > 0 ? " " : ""}${reducedNumerator}/${reducedDenominator}`;
  }

  if (output === sign) {
    output += "0";
  }

  return `${output}\"`;
}

function updateDiagram(frameHeight, anchor, centerHeight, nailHeight, topHeight, bottomHeight) {
  const wallHeightPx = 320;
  const tallestPoint = Math.max(topHeight, nailHeight);
  const paddingInches = 8;
  const scale = Math.min((wallHeightPx - 12) / (tallestPoint + paddingInches), 2);

  const framePixelHeight = frameHeight * scale;
  const bottomPixels = Math.max(bottomHeight * scale, 0);

  frameVisual.style.display = "block";
  frameVisual.style.height = `${framePixelHeight}px`;
  frameVisual.style.bottom = `${bottomPixels}px`;

  topLabel.textContent = `Top ${formatInches(topHeight)}`;
  bottomLabel.textContent = `Bottom ${formatInches(bottomHeight)}`;
  centerLabel.textContent = `Center ${formatInches(centerHeight)}`;

  anchorLabel.style.display = anchor > 0 ? "block" : "none";
  if (anchor > 0) {
    const anchorOffsetRatio = Math.min(anchor / frameHeight, 1);
    anchorLabel.style.top = `${anchorOffsetRatio * 100}%`;
    anchorLabel.textContent = `Drop ${formatInches(anchor)}`;
  }

  nailMark.style.display = "flex";
  nailMark.style.bottom = `${Math.max(nailHeight * scale, 0)}px`;
  nailLabel.textContent = `Nail ${formatInches(nailHeight)}`;

  if (anchor > 0 && nailWire) {
    nailWire.style.display = "block";
    nailWire.style.bottom = `${Math.max(nailHeight * scale, 0)}px`;
    nailWire.style.height = `${anchor * scale}px`;
  } else if (nailWire) {
    nailWire.style.display = "none";
  }
}

function handleCalculate() {
  const { error, frameHeight, anchor, centerHeight } = parseInputs();
  if (error) {
    resultValue.textContent = "Invalid input";
    resultValue.classList.add("is-error");
    resultValue.classList.remove("is-placeholder");
    resultSecondary.textContent = error;
    frameVisual.style.display = "none";
    nailMark.style.display = "none";
    if (nailWire) {
      nailWire.style.display = "none";
    }
    anchorLabel.style.display = "none";
    return;
  }

  const halfHeight = frameHeight / 2;
  const topHeight = centerHeight + halfHeight;
  const bottomHeight = centerHeight - halfHeight;
  const nailHeight = topHeight - anchor;

  const formattedNail = formatInches(nailHeight);
  resultValue.textContent = formattedNail;
  resultValue.classList.remove("is-placeholder", "is-error");
  resultSecondary.innerHTML = `Top edge: <strong>${formatInches(
    topHeight,
  )}</strong> &nbsp;·&nbsp; Bottom edge: <strong>${formatInches(bottomHeight)}</strong>`;

  updateDiagram(frameHeight, anchor, centerHeight, nailHeight, topHeight, bottomHeight);
}

[frameInchesInput, anchorInput, centerInchesInput].forEach((input) => {
  input.addEventListener("input", handleCalculate);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCalculate();
    }
  });
});

if (presetForm && presetNewButton && presetList && presetNameInput && presetEmptyState) {
  presetForm.addEventListener("submit", handlePresetFormSubmit);
  presetNewButton.addEventListener("click", handlePresetNewClick);
  presetList.addEventListener("click", handlePresetListClick);
  initializePresets();
}

// Provide a friendly default example on load
frameInchesInput.value = "24";
anchorInput.value = "2 1/2";
centerInchesInput.value = `${DEFAULT_CENTER_HEIGHT_INCHES}`;
handleCalculate();

function initializePresets() {
  presets = loadPresetsFromStorage();
  renderPresets();
  clearPresetForm();
}

function loadPresetsFromStorage() {
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const frameHeight = toNumberOrNull(item.frameHeight);
        const anchor = toNumberOrNull(item.anchor);
        const centerHeight = toNumberOrNull(item.centerHeight ?? DEFAULT_CENTER_HEIGHT_INCHES);

        if (
          !item.id ||
          typeof item.id !== "string" ||
          !item.name ||
          typeof item.name !== "string" ||
          frameHeight === null ||
          anchor === null ||
          centerHeight === null
        ) {
          return null;
        }

        return {
          id: item.id,
          name: item.name,
          frameRaw: getStringOrFallback(item.frameRaw, frameHeight),
          anchorRaw: getStringOrFallback(item.anchorRaw, anchor),
          centerRaw: getStringOrFallback(item.centerRaw, centerHeight),
          frameHeight,
          anchor,
          centerHeight,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn("Unable to load saved measurements:", error);
    return [];
  }
}

function persistPresets() {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.warn("Unable to save measurements:", error);
  }
}

function renderPresets() {
  if (!presetList || !presetEmptyState) {
    return;
  }

  presetList.innerHTML = "";

  if (!presets.length) {
    presetList.hidden = true;
    presetEmptyState.style.display = "block";
    return;
  }

  presetList.hidden = false;
  presetEmptyState.style.display = "none";

  presets.forEach((preset) => {
    const item = document.createElement("li");
    item.className = "preset-item";
    if (preset.id === activePresetId) {
      item.classList.add("is-active");
    }
    item.dataset.id = preset.id;

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "preset-item-main";

    const nameSpan = document.createElement("span");
    nameSpan.className = "preset-item-name";
    nameSpan.textContent = preset.name;

    const metaSpan = document.createElement("span");
    metaSpan.className = "preset-item-meta";
    metaSpan.textContent = `Frame ${formatInches(preset.frameHeight)} · Anchor ${formatInches(
      preset.anchor,
    )} · Center ${formatInches(preset.centerHeight)}`;

    mainButton.append(nameSpan, metaSpan);

    const actions = document.createElement("div");
    actions.className = "preset-item-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "preset-edit-button";
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "preset-delete-button";
    deleteButton.textContent = "Delete";

    actions.append(editButton, deleteButton);

    item.append(mainButton, actions);
    presetList.append(item);
  });
}

function handlePresetFormSubmit(event) {
  event.preventDefault();

  const name = presetNameInput.value.trim();
  if (name === "") {
    presetNameInput.focus();
    return;
  }

  const { error, frameHeight, anchor, centerHeight } = parseInputs();
  if (error) {
    handleCalculate();
    presetNameInput.focus();
    return;
  }

  const frameRaw = frameInchesInput.value.trim();
  const anchorRaw = anchorInput.value.trim();
  const centerRaw =
    centerInchesInput.value.trim() === ""
      ? `${DEFAULT_CENTER_HEIGHT_INCHES}`
      : centerInchesInput.value.trim();

  const payload = {
    id: presetIdInput.value || generatePresetId(),
    name,
    frameRaw,
    anchorRaw,
    centerRaw,
    frameHeight,
    anchor,
    centerHeight,
  };

  const existingIndex = presets.findIndex((preset) => preset.id === payload.id);

  if (existingIndex >= 0) {
    presets[existingIndex] = payload;
  } else {
    presets.push(payload);
  }

  activePresetId = payload.id;
  persistPresets();
  renderPresets();
  clearPresetForm();
  handleCalculate();
}

function handlePresetListClick(event) {
  const actionButton = event.target.closest("button");
  if (!actionButton) {
    return;
  }

  const listItem = actionButton.closest(".preset-item");
  if (!listItem) {
    return;
  }

  const presetId = listItem.dataset.id;
  const preset = presets.find((entry) => entry.id === presetId);
  if (!preset) {
    return;
  }

  if (actionButton.classList.contains("preset-delete-button")) {
    const confirmDelete = window.confirm(`Delete the preset "${preset.name}"?`);
    if (!confirmDelete) {
      return;
    }
    presets = presets.filter((entry) => entry.id !== presetId);
    if (activePresetId === presetId) {
      activePresetId = null;
    }
    persistPresets();
    renderPresets();
    if (presetIdInput.value === presetId) {
      clearPresetForm();
    }
    return;
  }

  loadPresetIntoInputs(preset);

  if (actionButton.classList.contains("preset-edit-button")) {
    startEditingPreset(preset);
  } else {
    clearPresetForm();
  }
}

function handlePresetNewClick() {
  const isEditing = Boolean(presetsCard && presetsCard.classList.contains("is-editing"));
  if (isEditing || presetNameInput.value.trim() !== "") {
    clearPresetForm();
    return;
  }

  presetNameInput.focus();
}

function loadPresetIntoInputs(preset) {
  frameInchesInput.value = preset.frameRaw || `${preset.frameHeight}`;
  anchorInput.value = preset.anchorRaw || `${preset.anchor}`;
  centerInchesInput.value = preset.centerRaw || `${preset.centerHeight}`;
  activePresetId = preset.id;
  handleCalculate();
  renderPresets();
}

function startEditingPreset(preset) {
  presetIdInput.value = preset.id;
  presetNameInput.value = preset.name;
  setEditingState(true);
  presetNameInput.focus({ preventScroll: true });
  presetNameInput.select();
}

function clearPresetForm() {
  if (presetForm) {
    presetForm.reset();
  }
  setEditingState(false);
  if (presetNameInput) {
    presetNameInput.blur();
  }
}

function setEditingState(isEditing) {
  if (presetsCard) {
    presetsCard.classList.toggle("is-editing", isEditing);
  }
  if (presetNewButton) {
    presetNewButton.textContent = isEditing ? "Cancel edit" : "New";
  }
  if (!isEditing && presetIdInput) {
    presetIdInput.value = "";
  }
}

function generatePresetId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getStringOrFallback(raw, fallbackNumber) {
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw;
  }
  return `${fallbackNumber}`;
}
