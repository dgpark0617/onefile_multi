export const gameSession = {
  input: { left: false, right: false },
  edge: { forward: false, punch: false },
  simulation: null,
  isInGame: false,

  getTurnInput() {
    const { left, right } = this.input;
    if (left && !right) return -1;
    if (right && !left) return 1;
    return 0;
  },

  consumePlayerInput() {
    const inp = {
      t: this.getTurnInput(),
      f: this.edge.forward ? 1 : 0,
      p: this.edge.punch ? 1 : 0,
    };
    this.edge.forward = false;
    this.edge.punch = false;
    return inp;
  },

  clear() {
    this.input.left = false;
    this.input.right = false;
    this.edge.forward = false;
    this.edge.punch = false;
    this.simulation = null;
    this.isInGame = false;
  },
};
