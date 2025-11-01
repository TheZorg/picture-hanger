const FEET_TO_INCHES = 12;
const CENTER_HEIGHT_INCHES = 60; // 5 feet

const frameFeetInput = document.getElementById("frame-feet");
const frameInchesInput = document.getElementById("frame-inches");
const anchorInput = document.getElementById("anchor-inches");
const calculateButton = document.getElementById("calculate");
const resultText = document.getElementById("result-text");
const frameVisual = document.getElementById("frame-visual");
const topLabel = document.getElementById("top-label");
const bottomLabel = document.getElementById("bottom-label");
const centerLabel = document.getElementById("center-label");
const anchorLabel = document.getElementById("anchor-label");
const nailMark = document.getElementById("nail-mark");
const nailLabel = document.getElementById("nail-label");

function parseInputs() {
  const feet = parseFloat(frameFeetInput.value) || 0;
  const inches = parseFloat(frameInchesInput.value) || 0;
  const anchor = parseFloat(anchorInput.value);

  if (Number.isNaN(anchor)) {
    return { error: "Enter the anchor distance in inches." };
  }

  const frameHeight = feet * FEET_TO_INCHES + inches;

  if (frameHeight <= 0) {
    return { error: "Frame height must be greater than zero." };
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

function formatFeetInches(value) {
  const sign = value < 0 ? "-" : "";
  const totalInches = Math.abs(value);
  const feet = Math.floor(totalInches / FEET_TO_INCHES);
  const inches = totalInches - feet * FEET_TO_INCHES;
  return `${sign}${feet}' ${formatInches(inches).replace('"', '')}\"`;
}

function updateDiagram(frameHeight, anchor, nailHeight, topHeight, bottomHeight) {
  const scale = 280 / (CENTER_HEIGHT_INCHES * 2);
  const framePixelHeight = Math.max(frameHeight * scale, 24);
  frameVisual.style.display = "block";
  frameVisual.style.height = `${framePixelHeight}px`;

  frameVisual.style.marginBottom = `${Math.max(bottomHeight * scale, 0)}px`;

  topLabel.textContent = `Top: ${formatInches(topHeight)} (${formatFeetInches(topHeight)})`;
  bottomLabel.textContent = `Bottom: ${formatInches(bottomHeight)} (${formatFeetInches(bottomHeight)})`;
  centerLabel.textContent = `Center: ${formatInches(CENTER_HEIGHT_INCHES)} (5' 0\")`;

  const anchorOffsetRatio = anchor / frameHeight;
  anchorLabel.style.display = anchor > 0 ? "block" : "none";
  if (anchor > 0) {
    anchorLabel.style.top = `${anchorOffsetRatio * 100}%`;
    const anchorHeight = topHeight - anchor;
    anchorLabel.textContent = `Anchor: ${formatInches(anchorHeight)} (${formatFeetInches(anchorHeight)})`;
  }

  nailMark.style.display = "flex";
  nailMark.style.bottom = `${nailHeight * scale}px`;
  nailLabel.textContent = `Nail: ${formatInches(nailHeight)} (${formatFeetInches(nailHeight)})`;
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
  const formattedFeet = formatFeetInches(nailHeight);

  resultText.innerHTML = `
    <p><strong>Nail height:</strong> ${formattedNail} (${formattedFeet}) from the floor.</p>
    <p>The top of the frame will sit at ${formatInches(topHeight)} (${formatFeetInches(topHeight)}), and the bottom will be at ${formatInches(bottomHeight)} (${formatFeetInches(bottomHeight)}).</p>
  `;

  updateDiagram(frameHeight, anchor, nailHeight, topHeight, bottomHeight);
}

calculateButton.addEventListener("click", handleCalculate);

[frameFeetInput, frameInchesInput, anchorInput].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleCalculate();
    }
  });
});

// Provide a friendly default example on load
frameFeetInput.value = "2";
frameInchesInput.value = "0";
anchorInput.value = "2.5";
handleCalculate();
