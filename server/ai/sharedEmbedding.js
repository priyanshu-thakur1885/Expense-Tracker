function embedText(value = '') {
  const text = String(value || '').toLowerCase();
  const vector = new Array(8).fill(0).map((_, index) => {
    const charCode = text.charCodeAt(index % text.length || 0) || 0;
    return charCode / 255;
  });
  return vector;
}

module.exports = {
  embedText
};
