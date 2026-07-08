export const gameSession = {
  pick: null,
  quiz: null,
  isInGame: false,
  _revealPending: false,

  pickAndReveal(direction) {
    if (!this.quiz || this.quiz.state !== "prompt") return false;
    if (!this.quiz.setPick(direction)) return false;
    this.pick = direction;
    this._revealPending = true;
    return true;
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
