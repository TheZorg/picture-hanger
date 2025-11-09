const UNITS = {
  INCHES: "in",
  CENTIMETERS: "cm",
};

const UNIT_OPTIONS = new Set([UNITS.INCHES, UNITS.CENTIMETERS]);

const DEFAULT_CENTER_HEIGHT = {
  [UNITS.INCHES]: 60,
  [UNITS.CENTIMETERS]: 150,
};

const DEFAULT_EXAMPLES = {
  [UNITS.INCHES]: { frame: "24", anchor: "2 1/2", center: "60" },
  [UNITS.CENTIMETERS]: { frame: "60", anchor: "5", center: "150" },
};

const UNIT_LABELS = {
  [UNITS.INCHES]: { short: "in", long: "inches" },
  [UNITS.CENTIMETERS]: { short: "cm", long: "centimeters" },
};

const frameInput = document.getElementById("frame-value");
const anchorInput = document.getElementById("anchor-value");
const centerInput = document.getElementById("center-value");
const unitInputs = document.querySelectorAll('input[name="unit-system"]');
const unitCopyNodes = document.querySelectorAll("[data-unit-copy]");
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
const presetForm = document.getElementById("preset-form");
const presetIdInput = document.getElementById("preset-id");
const presetNameInput = document.getElementById("preset-name");
const presetList = document.getElementById("preset-list");
const presetEmptyState = document.getElementById("preset-empty");
const presetNewButton = document.getElementById("preset-new");
const presetUndoContainer = document.getElementById("preset-undo");
const presetUndoMessage = document.getElementById("preset-undo-message");
const presetUndoButton = document.getElementById("preset-undo-button");
const presetsCard = document.querySelector(".presets-card");
const themeSelect = document.getElementById("theme-select");
const fractionButtons = document.querySelectorAll(
  "[data-fraction-value][data-target-input]",
);

const UNIT_STORAGE_KEY = "picture-hanger-unit";
const PRESET_STORAGE_KEY = "picture-hanger-presets";
const THEME_STORAGE_KEY = "picture-hanger-theme";
const THEME_OPTIONS = new Set(["light", "dark", "system"]);
const DELETE_CONFIRM_TIMEOUT_MS = 5000;
const UNDO_TIMEOUT_MS = 8000;
const DEFAULT_SECONDARY_MESSAGES = {
  [UNITS.INCHES]: "We'll show the top and bottom of the frame once you add your numbers.",
  [UNITS.CENTIMETERS]: "We'll show the top and bottom of the frame once you add your numbers.",
};
const systemColorScheme =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
let presets = [];
let activePresetId = null;
let pendingDeleteButton = null;
let pendingDeleteTimer = null;
let lastDeletedPreset = null;
let undoTimer = null;
let currentUnit = UNITS.INCHES;
let defaultSecondaryMessage = DEFAULT_SECONDARY_MESSAGES[currentUnit];

resultValue.classList.add("is-placeholder");

initThemeControls();
initUnitControls();

function initThemeControls() {
  const storedMode = readStoredThemePreference();
  const initialMode = storedMode ?? "system";
  applyThemeMode(initialMode);

  if (themeSelect) {
    themeSelect.value = initialMode;
    themeSelect.addEventListener("change", (event) => {
      const selected = event.target.value;
      const nextMode = THEME_OPTIONS.has(selected) ? selected : "system";
      applyThemeMode(nextMode);
      persistThemePreference(nextMode);
    });
  }

  if (systemColorScheme) {
    const handleSystemChange = () => {
      if (document.documentElement.dataset.themeMode === "system") {
        applyThemeMode("system");
      }
    };

    if (typeof systemColorScheme.addEventListener === "function") {
      systemColorScheme.addEventListener("change", handleSystemChange);
    } else if (typeof systemColorScheme.addListener === "function") {
      systemColorScheme.addListener(handleSystemChange);
    }
  }
}

function applyThemeMode(mode) {
  const resolved = resolveThemeMode(mode);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;

  if (themeSelect && themeSelect.value !== mode) {
    themeSelect.value = mode;
  }
}

function resolveThemeMode(mode) {
  if (mode === "dark" || mode === "light") {
    return mode;
  }

  if (mode === "system") {
    if (systemColorScheme && typeof systemColorScheme.matches === "boolean") {
      return systemColorScheme.matches ? "dark" : "light";
    }
    return "light";
  }

  return "light";
}

function readStoredThemePreference() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEME_OPTIONS.has(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn("Unable to load theme preference:", error);
  }

  return null;
}

function persistThemePreference(mode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn("Unable to save theme preference:", error);
  }
}

function initUnitControls() {
  const storedUnit = readStoredUnitPreference();
  const initialUnit = storedUnit && UNIT_OPTIONS.has(storedUnit) ? storedUnit : UNITS.INCHES;
  currentUnit = initialUnit;

  updateUnitRadios(initialUnit);
  applyUnitCopies(initialUnit);
  applyInputPlaceholders(initialUnit);
  applyDefaultExample(initialUnit);
  defaultSecondaryMessage = DEFAULT_SECONDARY_MESSAGES[initialUnit] ?? defaultSecondaryMessage;
  if (
    resultSecondary &&
    resultValue &&
    (resultValue.classList.contains("is-placeholder") || resultValue.classList.contains("is-error"))
  ) {
    resultSecondary.textContent = defaultSecondaryMessage;
  }

  unitInputs.forEach((input) => {
    if (!input) {
      return;
    }
    input.checked = input.value === initialUnit;
    input.addEventListener("change", (event) => {
      if (!event.target.checked) {
        return;
      }
      const selected = event.target.value;
      if (!UNIT_OPTIONS.has(selected)) {
        return;
      }
      changeUnit(selected, { triggeredByUser: true });
    });
  });
}

function changeUnit(nextUnit, { triggeredByUser = false, skipConversion = false } = {}) {
  if (!UNIT_OPTIONS.has(nextUnit)) {
    return;
  }

  if (nextUnit === currentUnit && !skipConversion) {
    persistUnitPreference(nextUnit);
    return;
  }

  const previousUnit = currentUnit;
  currentUnit = nextUnit;

  updateUnitRadios(nextUnit);
  applyUnitCopies(nextUnit);
  applyInputPlaceholders(nextUnit);

  const previousDefaultMessage = defaultSecondaryMessage;
  defaultSecondaryMessage = DEFAULT_SECONDARY_MESSAGES[nextUnit] ?? defaultSecondaryMessage;

  if (!skipConversion) {
    const useDefaults = triggeredByUser && inputsMatchDefaultExamples(previousUnit);
    if (useDefaults) {
      applyDefaultExample(nextUnit);
    } else {
      convertInputValues(previousUnit, nextUnit);
    }
  }

  if (
    resultSecondary &&
    resultValue &&
    (resultValue.classList.contains("is-placeholder") || resultValue.classList.contains("is-error"))
  ) {
    resultSecondary.textContent = defaultSecondaryMessage;
  } else if (resultSecondary && resultSecondary.textContent === previousDefaultMessage) {
    resultSecondary.textContent = defaultSecondaryMessage;
  }

  persistUnitPreference(nextUnit);
  handleCalculate();
  renderPresets();
}

function applyUnitCopies(unit) {
  const copyKey = unit === UNITS.CENTIMETERS ? "unitCm" : "unitIn";
  unitCopyNodes.forEach((node) => {
    if (!node.dataset[copyKey]) {
      return;
    }
    const format = node.dataset.unitFormat || "text";
    if (format === "html") {
      node.innerHTML = node.dataset[copyKey];
    } else {
      node.textContent = node.dataset[copyKey];
    }
  });
}

function applyInputPlaceholders(unit) {
  const placeholderKey = unit === UNITS.CENTIMETERS ? "placeholderCm" : "placeholderIn";
  [frameInput, anchorInput, centerInput].forEach((input) => {
    if (!input) {
      return;
    }
    const nextPlaceholder = input.dataset[placeholderKey];
    if (nextPlaceholder) {
      input.placeholder = nextPlaceholder;
    }
  });
}

function applyDefaultExample(unit) {
  const example = DEFAULT_EXAMPLES[unit] ?? DEFAULT_EXAMPLES[UNITS.INCHES];
  if (frameInput) {
    frameInput.value = example.frame;
  }
  if (anchorInput) {
    anchorInput.value = example.anchor;
  }
  if (centerInput) {
    centerInput.value = example.center;
  }
}

function updateUnitRadios(unit) {
  unitInputs.forEach((input) => {
    if (input) {
      input.checked = input.value === unit;
    }
  });
}

function inputsMatchDefaultExamples(unit) {
  const example = DEFAULT_EXAMPLES[unit];
  if (!example) {
    return false;
  }

  const frameValue = frameInput ? frameInput.value.trim() : "";
  const anchorValue = anchorInput ? anchorInput.value.trim() : "";
  const centerValue = centerInput ? centerInput.value.trim() : "";
  const centerMatches = centerValue === "" || centerValue === example.center;

  return frameValue === example.frame && anchorValue === example.anchor && centerMatches;
}

function convertInputValues(fromUnit, toUnit) {
  if (fromUnit === toUnit) {
    return;
  }

  const configs = [
    { input: frameInput, allowBlank: false },
    { input: anchorInput, allowBlank: false },
    { input: centerInput, allowBlank: true },
  ];

  configs.forEach(({ input, allowBlank }) => {
    if (!input) {
      return;
    }
    const raw = input.value.trim();
    if (raw === "") {
      if (!allowBlank) {
        input.value = "";
      }
      return;
    }
    const parsed = parseMeasurement(raw);
    if (Number.isNaN(parsed)) {
      return;
    }
    const valueInInches = convertToInches(parsed, fromUnit);
    input.value = formatInputValue(valueInInches, toUnit);
  });
}

function formatInputValue(valueInInches, unit) {
  if (unit === UNITS.CENTIMETERS) {
    const centimeters = convertFromInches(valueInInches, UNITS.CENTIMETERS);
    return formatCentimeters(centimeters, { includeUnit: false });
  }
  return formatInchesPlain(valueInInches);
}

function readStoredUnitPreference() {
  try {
    return localStorage.getItem(UNIT_STORAGE_KEY) || null;
  } catch (error) {
    console.warn("Unable to load unit preference:", error);
    return null;
  }
}

function persistUnitPreference(unit) {
  try {
    localStorage.setItem(UNIT_STORAGE_KEY, unit);
  } catch (error) {
    console.warn("Unable to save unit preference:", error);
  }
}

function getDefaultCenterForUnit(unit) {
  return DEFAULT_CENTER_HEIGHT[unit] ?? DEFAULT_CENTER_HEIGHT[UNITS.INCHES];
}

function getUnitLabels(unit) {
  return UNIT_LABELS[unit] ?? UNIT_LABELS[UNITS.INCHES];
}

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

function insertFractionIntoInput(targetInput, fractionValue) {
  if (!targetInput || !fractionValue) {
    return;
  }

  const input = targetInput;
  if (typeof input.focus === "function") {
    input.focus();
  }

  const selectionStart =
    typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
  const selectionEnd =
    typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
  const before = input.value.slice(0, selectionStart);
  const after = input.value.slice(selectionEnd);
  const needsLeadingSpace = before !== "" && !/\s$/.test(before);
  const needsTrailingSpace = after !== "" && !/^\s/.test(after);
  let insertion = fractionValue;
  if (needsLeadingSpace) {
    insertion = ` ${insertion}`;
  }
  if (needsTrailingSpace) {
    insertion = `${insertion} `;
  }
  const nextValue = `${before}${insertion}${after}`;

  input.value = nextValue;

  const nextCursor = before.length + insertion.length;
  if (typeof input.setSelectionRange === "function") {
    input.setSelectionRange(nextCursor, nextCursor);
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function parseInputs() {
  const labels = getUnitLabels(currentUnit);

  const frameValue = frameInput ? parseMeasurement(frameInput.value) : NaN;
  if (Number.isNaN(frameValue)) {
    return {
      error: `Enter the frame height in ${labels.long} (you can use decimals or fractions like 30 1/2).`,
    };
  }
  if (frameValue <= 0) {
    return { error: "Frame height must be greater than zero." };
  }

  const anchorValue = anchorInput ? parseMeasurement(anchorInput.value) : NaN;
  if (Number.isNaN(anchorValue)) {
    return {
      error: `Enter the anchor distance in ${labels.long} (decimals or fractions are OK).`,
    };
  }
  if (anchorValue < 0) {
    return { error: "Anchor distance can’t be negative." };
  }
  if (anchorValue > frameValue) {
    return { error: "Anchor distance can’t be greater than the frame height." };
  }

  const centerRaw = centerInput ? centerInput.value : "";
  let centerValue;
  if (!centerRaw || centerRaw.trim() === "") {
    centerValue = getDefaultCenterForUnit(currentUnit);
  } else {
    centerValue = parseMeasurement(centerRaw);
    if (Number.isNaN(centerValue)) {
      return {
        error: `Enter the target center height in ${labels.long} (decimals or fractions are OK).`,
      };
    }
  }

  if (centerValue <= 0) {
    return { error: "Target center height must be greater than zero." };
  }

  const frameHeightInches = convertToInches(frameValue, currentUnit);
  const anchorInches = convertToInches(anchorValue, currentUnit);
  const centerHeightInches = convertToInches(centerValue, currentUnit);

  return {
    frameHeight: frameHeightInches,
    anchor: anchorInches,
    centerHeight: centerHeightInches,
    displayValues: {
      frame: frameValue,
      anchor: anchorValue,
      center: centerValue,
    },
  };
}

function convertToInches(value, unit) {
  if (unit === UNITS.CENTIMETERS) {
    return value / 2.54;
  }
  return value;
}

function convertFromInches(value, unit) {
  if (unit === UNITS.CENTIMETERS) {
    return value * 2.54;
  }
  return value;
}

function formatCentimeters(value, { includeUnit = true } = {}) {
  const rounded = Math.round(value * 10) / 10;
  const formatted = Number.isInteger(rounded) ? `${Math.trunc(rounded)}` : rounded.toFixed(1);
  return includeUnit ? `${formatted} cm` : formatted;
}

function formatMeasurement(valueInInches, unit) {
  if (unit === UNITS.CENTIMETERS) {
    const centimeters = convertFromInches(valueInInches, UNITS.CENTIMETERS);
    return formatCentimeters(centimeters, { includeUnit: true });
  }
  return `${formatInchesPlain(valueInInches)}"`;
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
  return `${formatInchesPlain(value)}\"`;
}

function formatInchesPlain(value) {
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

  return output;
}

function computeFrameMeasurements(frameHeight, anchor, centerHeight) {
  const halfHeight = frameHeight / 2;
  const topHeight = centerHeight + halfHeight;
  const bottomHeight = centerHeight - halfHeight;
  const nailHeight = topHeight - anchor;
  return { topHeight, bottomHeight, nailHeight };
}

function updateDiagram(
  frameHeightInches,
  anchorInches,
  centerHeightInches,
  nailHeightInches,
  topHeightInches,
  bottomHeightInches,
  unit,
) {
  if (!frameVisual || !topLabel || !bottomLabel || !centerLabel || !anchorLabel || !nailMark || !nailLabel) {
    return;
  }

  const wallHeightPx = 320;
  const tallestPoint = Math.max(topHeightInches, nailHeightInches);
  const paddingInches = 8;
  const scale = Math.min((wallHeightPx - 12) / (tallestPoint + paddingInches), 2);

  const framePixelHeight = frameHeightInches * scale;
  const bottomPixels = Math.max(bottomHeightInches * scale, 0);

  frameVisual.style.display = "block";
  frameVisual.style.height = `${framePixelHeight}px`;
  frameVisual.style.bottom = `${bottomPixels}px`;

  topLabel.textContent = `Top ${formatMeasurement(topHeightInches, unit)}`;
  bottomLabel.textContent = `Bottom ${formatMeasurement(bottomHeightInches, unit)}`;
  centerLabel.textContent = `Center ${formatMeasurement(centerHeightInches, unit)}`;

  const hasAnchor = anchorInches > 0;
  anchorLabel.style.display = hasAnchor ? "block" : "none";
  if (hasAnchor) {
    const anchorOffsetRatio = Math.min(anchorInches / frameHeightInches, 1);
    anchorLabel.style.top = `${anchorOffsetRatio * 100}%`;
    anchorLabel.textContent = `Drop ${formatMeasurement(anchorInches, unit)}`;
  }

  nailMark.style.display = "flex";
  nailMark.style.bottom = `${Math.max(nailHeightInches * scale, 0)}px`;
  nailLabel.textContent = `Nail ${formatMeasurement(nailHeightInches, unit)}`;

  if (nailWire) {
    if (hasAnchor) {
      nailWire.style.display = "block";
      nailWire.style.bottom = `${Math.max(nailHeightInches * scale, 0)}px`;
      nailWire.style.height = `${anchorInches * scale}px`;
    } else {
      nailWire.style.display = "none";
    }
  }
}

function handleCalculate() {
  const { error, frameHeight, anchor, centerHeight } = parseInputs();
  if (error) {
    resultValue.textContent = error;
    resultValue.classList.add("is-error");
    resultValue.classList.remove("is-placeholder");
    if (resultSecondary) {
      resultSecondary.textContent = defaultSecondaryMessage;
    }
    if (frameVisual) {
      frameVisual.style.display = "none";
    }
    if (nailMark) {
      nailMark.style.display = "none";
    }
    if (nailWire) {
      nailWire.style.display = "none";
    }
    if (anchorLabel) {
      anchorLabel.style.display = "none";
    }
    return;
  }

  const { topHeight, bottomHeight, nailHeight } = computeFrameMeasurements(
    frameHeight,
    anchor,
    centerHeight,
  );

  const formattedNail = formatMeasurement(nailHeight, currentUnit);
  resultValue.textContent = formattedNail;
  resultValue.classList.remove("is-placeholder", "is-error");
  if (resultSecondary) {
    resultSecondary.innerHTML = `Top edge: <strong>${formatMeasurement(
      topHeight,
      currentUnit,
    )}</strong> &nbsp;·&nbsp; Bottom edge: <strong>${formatMeasurement(bottomHeight, currentUnit)}</strong>`;
  }

  updateDiagram(frameHeight, anchor, centerHeight, nailHeight, topHeight, bottomHeight, currentUnit);
}

[frameInput, anchorInput, centerInput].forEach((input) => {
  if (!input) {
    return;
  }
  input.addEventListener("input", handleCalculate);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCalculate();
    }
  });
});

fractionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.targetInput;
    const fractionValue = button.dataset.fractionValue;
    if (!targetId || !fractionValue) {
      return;
    }
    const targetInput = document.getElementById(targetId);
    if (!targetInput) {
      return;
    }
    insertFractionIntoInput(targetInput, fractionValue);
  });
});

if (presetForm && presetNewButton && presetList && presetNameInput && presetEmptyState) {
  presetForm.addEventListener("submit", handlePresetFormSubmit);
  presetNewButton.addEventListener("click", handlePresetNewClick);
  presetList.addEventListener("click", handlePresetListClick);
  initializePresets();
}

if (presetUndoButton) {
  presetUndoButton.addEventListener("click", handlePresetUndoClick);
}

handleCalculate();

function initializePresets() {
  presets = loadPresetsFromStorage();
  renderPresets();
  clearPresetForm();
  clearUndoState();
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

        const unit = item.unit && UNIT_OPTIONS.has(item.unit) ? item.unit : UNITS.INCHES;
        const frameHeight = toNumberOrNull(item.frameHeight);
        const anchor = toNumberOrNull(item.anchor);
        const fallbackCenterInches = convertToInches(getDefaultCenterForUnit(unit), unit);
        const centerHeight = toNumberOrNull(item.centerHeight ?? fallbackCenterInches);

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
          frameRaw: getStringOrFallback(item.frameRaw, frameHeight, unit),
          anchorRaw: getStringOrFallback(item.anchorRaw, anchor, unit),
          centerRaw: getStringOrFallback(item.centerRaw, centerHeight, unit),
          frameHeight,
          anchor,
          centerHeight,
          unit,
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
    const metaUnit = preset.unit && UNIT_OPTIONS.has(preset.unit) ? preset.unit : UNITS.INCHES;
    const { nailHeight } = computeFrameMeasurements(
      preset.frameHeight,
      preset.anchor,
      preset.centerHeight,
    );
    metaSpan.textContent = `Frame ${formatMeasurement(preset.frameHeight, metaUnit)} · Anchor ${formatMeasurement(
      preset.anchor,
      metaUnit,
    )} · Center ${formatMeasurement(preset.centerHeight, metaUnit)} · Nail ${formatMeasurement(
      nailHeight,
      metaUnit,
    )}`;

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
  clearPendingDeleteButton();

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

  const frameRaw = frameInput ? frameInput.value.trim() : "";
  const anchorRaw = anchorInput ? anchorInput.value.trim() : "";
  const rawCenterInput = centerInput ? centerInput.value.trim() : "";
  const defaultCenterString =
    (DEFAULT_EXAMPLES[currentUnit] && DEFAULT_EXAMPLES[currentUnit].center) ||
    `${getDefaultCenterForUnit(currentUnit)}`;
  const centerRaw = rawCenterInput === "" ? defaultCenterString : rawCenterInput;

  const payload = {
    id: presetIdInput.value || generatePresetId(),
    name,
    frameRaw,
    anchorRaw,
    centerRaw,
    frameHeight,
    anchor,
    centerHeight,
    unit: currentUnit,
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
  const presetIndex = presets.findIndex((entry) => entry.id === presetId);
  if (presetIndex < 0) {
    return;
  }
  const preset = presets[presetIndex];

  if (actionButton.classList.contains("preset-delete-button")) {
    handlePresetDeleteClick(actionButton, presetIndex);
    return;
  }

  clearPendingDeleteButton();

  loadPresetIntoInputs(preset);

  if (actionButton.classList.contains("preset-edit-button")) {
    startEditingPreset(preset);
  } else {
    clearPresetForm();
  }
}

function handlePresetDeleteClick(button, presetIndex) {
  const preset = presets[presetIndex];
  if (!preset) {
    return;
  }

  if (pendingDeleteButton && pendingDeleteButton !== button) {
    clearPendingDeleteButton();
  }

  if (pendingDeleteButton !== button) {
    armDeleteConfirmation(button);
    return;
  }

  clearPendingDeleteButton();
  deletePresetAtIndex(presetIndex);
}

function handlePresetNewClick() {
  clearPendingDeleteButton();
  const isEditing = Boolean(presetsCard && presetsCard.classList.contains("is-editing"));
  if (isEditing || presetNameInput.value.trim() !== "") {
    clearPresetForm();
    return;
  }

  presetNameInput.focus();
}

function loadPresetIntoInputs(preset) {
  const presetUnit = preset.unit && UNIT_OPTIONS.has(preset.unit) ? preset.unit : UNITS.INCHES;
  if (presetUnit !== currentUnit) {
    changeUnit(presetUnit, { skipConversion: true });
  } else {
    applyUnitCopies(presetUnit);
    applyInputPlaceholders(presetUnit);
  }

  if (frameInput) {
    frameInput.value = preset.frameRaw || formatInputValue(preset.frameHeight, presetUnit);
  }
  if (anchorInput) {
    anchorInput.value = preset.anchorRaw || formatInputValue(preset.anchor, presetUnit);
  }
  if (centerInput) {
    centerInput.value = preset.centerRaw || formatInputValue(preset.centerHeight, presetUnit);
  }
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
  clearPendingDeleteButton();
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

function armDeleteConfirmation(button) {
  const originalLabel = button.dataset.originalLabel || button.textContent || "Delete";
  button.dataset.originalLabel = originalLabel;
  button.textContent = "Are you sure?";
  button.classList.add("is-confirm");
  pendingDeleteButton = button;
  if (pendingDeleteTimer) {
    clearTimeout(pendingDeleteTimer);
  }
  pendingDeleteTimer = window.setTimeout(() => {
    if (pendingDeleteButton === button) {
      clearPendingDeleteButton();
    }
  }, DELETE_CONFIRM_TIMEOUT_MS);
}

function clearPendingDeleteButton() {
  if (pendingDeleteTimer) {
    clearTimeout(pendingDeleteTimer);
    pendingDeleteTimer = null;
  }
  if (pendingDeleteButton) {
    const originalLabel = pendingDeleteButton.dataset.originalLabel || "Delete";
    pendingDeleteButton.textContent = originalLabel;
    pendingDeleteButton.classList.remove("is-confirm");
    delete pendingDeleteButton.dataset.originalLabel;
    pendingDeleteButton = null;
  }
}

function deletePresetAtIndex(presetIndex) {
  const [removedPreset] = presets.splice(presetIndex, 1);
  if (!removedPreset) {
    return;
  }

  const wasActive = activePresetId === removedPreset.id;
  if (wasActive) {
    activePresetId = null;
  }

  lastDeletedPreset = {
    preset: removedPreset,
    index: presetIndex,
    wasActive,
  };

  persistPresets();
  renderPresets();

  if (presetIdInput.value === removedPreset.id) {
    clearPresetForm();
  }

  showUndoMessage(removedPreset.name);
}

function showUndoMessage(name) {
  if (!presetUndoContainer || !presetUndoMessage) {
    return;
  }
  if (undoTimer) {
    clearTimeout(undoTimer);
  }
  presetUndoMessage.textContent = `Deleted "${name}".`;
  presetUndoContainer.hidden = false;
  undoTimer = window.setTimeout(() => {
    clearUndoState();
  }, UNDO_TIMEOUT_MS);
}

function clearUndoState() {
  if (undoTimer) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }
  lastDeletedPreset = null;
  if (presetUndoContainer) {
    presetUndoContainer.hidden = true;
  }
  if (presetUndoMessage) {
    presetUndoMessage.textContent = "";
  }
}

function handlePresetUndoClick() {
  if (!lastDeletedPreset) {
    clearUndoState();
    return;
  }

  clearPendingDeleteButton();

  const { preset, index, wasActive } = lastDeletedPreset;
  const insertIndex = Math.min(index, presets.length);
  presets.splice(insertIndex, 0, preset);
  persistPresets();

  if (wasActive) {
    loadPresetIntoInputs(preset);
  } else {
    renderPresets();
  }

  clearUndoState();
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

function getStringOrFallback(raw, fallbackNumber, unit = UNITS.INCHES) {
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw;
  }
  if (fallbackNumber === null || typeof fallbackNumber !== "number" || Number.isNaN(fallbackNumber)) {
    return "";
  }
  return formatInputValue(fallbackNumber, unit);
}
