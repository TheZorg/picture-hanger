const CENTER_HEIGHT_INCHES = 60; // 5 feet

const frameInchesInput = document.getElementById("frame-inches");
const anchorInput = document.getElementById("anchor-inches");
const resultText = document.getElementById("result-text");
const frameVisual = document.getElementById("frame-visual");
const topLabel = document.getElementById("top-label");
const bottomLabel = document.getElementById("bottom-label");
const centerLabel = document.getElementById("center-label");
const anchorLabel = document.getElementById("anchor-label");
const nailMark = document.getElementById("nail-mark");
const nailLabel = document.getElementById("nail-label");

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

  return { frameHeight, anchor };
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

function updateDiagram(frameHeight, anchor, nailHeight, topHeight, bottomHeight) {
  const scale = 280 / (CENTER_HEIGHT_INCHES * 2);
  const framePixelHeight = Math.max(frameHeight * scale, 24);
  frameVisual.style.display = "block";
  frameVisual.style.height = `${framePixelHeight}px`;

  frameVisual.style.marginBottom = `${Math.max(bottomHeight * scale, 0)}px`;

  topLabel.textContent = `Top: ${formatInches(topHeight)}`;
  bottomLabel.textContent = `Bottom: ${formatInches(bottomHeight)}`;
  centerLabel.textContent = `Center: ${formatInches(CENTER_HEIGHT_INCHES)}`;

  const anchorOffsetRatio = anchor / frameHeight;
  anchorLabel.style.display = anchor > 0 ? "block" : "none";
  if (anchor > 0) {
    anchorLabel.style.top = `${anchorOffsetRatio * 100}%`;
    const anchorHeight = topHeight - anchor;
    anchorLabel.textContent = `Anchor: ${formatInches(anchorHeight)}`;
  }

  nailMark.style.display = "flex";
  nailMark.style.bottom = `${nailHeight * scale}px`;
  nailLabel.textContent = `Nail: ${formatInches(nailHeight)}`;
}

function handleCalculate() {
  const { error, frameHeight, anchor } = parseInputs();
  if (error) {
    resultText.textContent = error;
    frameVisual.style.display = "none";
    nailMark.style.display = "none";
    return;
  }

  const halfHeight = frameHeight / 2;
  const topHeight = CENTER_HEIGHT_INCHES + halfHeight;
  const bottomHeight = CENTER_HEIGHT_INCHES - halfHeight;
  const nailHeight = topHeight - anchor;

  const formattedNail = formatInches(nailHeight);
  resultText.innerHTML = `
    <p><strong>Nail height:</strong> ${formattedNail} from the floor.</p>
    <p>The top of the frame will sit at ${formatInches(topHeight)}, and the bottom will be at ${formatInches(bottomHeight)}.</p>
  `;

  updateDiagram(frameHeight, anchor, nailHeight, topHeight, bottomHeight);
}

[frameInchesInput, anchorInput].forEach((input) => {
  input.addEventListener("input", handleCalculate);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCalculate();
    }
  });
});

// Provide a friendly default example on load
frameInchesInput.value = "24";
anchorInput.value = "2 1/2";
handleCalculate();
