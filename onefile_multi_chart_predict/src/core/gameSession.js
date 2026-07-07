export const gameSession = {
  pick: null,
  quiz: null,
  isInGame: false,
  _revealPending: false,

  requestReveal() {
    this._revealPending = true;
  },

  consumeReveal() {
    const v = this._revealPending;
    this._revealPending = false;
    return v;
  },

  clear() {
    this.pick = null;
    this.quiz = null;
    this.isInGame = false;
    this._revealPending = false;
  },
};
