export const gameSession = {
  input: { left: false, right: false },
  simulation: null,
  isInGame: false,

  getTurnInput() {
    const { left, right } = this.input;
    if (left && !right) return -1;
    if (right && !left) return 1;
    return 0;
  },

  clear() {
    this.input.left = false;
    this.input.right = false;
    this.simulation = null;
    this.isInGame = false;
  },
};
