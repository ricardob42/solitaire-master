import type { Candidate, HintReason } from '../engine/moves';
import type { GameRecord, PileRef } from '../engine/types';

export type ModalName = 'victory' | 'stats' | 'settings' | 'import' | null;

export interface ActiveHint {
  id: number;
  move: Candidate | null; // null = draw from the stock
  why: HintReason;
}
export interface Pop {
  id: number;
  pile: PileRef;
  delta: number;
}
export interface VictoryData {
  score: number;
  moves: number;
  time: number;
  newBest: boolean;
  difficulty: number; // 0 = not shown
}

let seq = 0;

/** Transient presentation state: modals, toast, hint highlight, score pops, update/install prompts. */
class UI {
  modal = $state<ModalName>(null);
  toastMsg = $state<{ id: number; text: string } | null>(null);
  hint = $state.raw<ActiveHint | null>(null);
  pops = $state.raw<Pop[]>([]);
  landed = $state([0, 0, 0, 0]); // per-foundation counter that restarts the landing glow
  shaken = $state<{ id: number; card: number } | null>(null);
  cascade = $state(false);
  victory = $state.raw<VictoryData | null>(null);
  pendingImport = $state.raw<GameRecord | null>(null);
  needRefresh = $state(false);
  offlineReady = $state(false);
  installable = $state(false);

  private toastTimer = 0;
  private hintTimer = 0;

  toast(text: string) {
    this.toastMsg = { id: ++seq, text };
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastMsg = null), 2300);
  }

  showHint(move: Candidate | null, why: HintReason, ms = 4600) {
    this.clearHint();
    this.hint = { id: ++seq, move, why };
    this.hintTimer = window.setTimeout(() => (this.hint = null), ms);
  }
  clearHint() {
    clearTimeout(this.hintTimer);
    if (this.hint) this.hint = null;
  }

  pop(pile: PileRef, delta: number) {
    if (!delta) return;
    const p = { id: ++seq, pile, delta };
    this.pops = [...this.pops, p];
    window.setTimeout(() => this.removePop(p.id), 1300);
  }
  removePop(id: number) {
    if (this.pops.some((p) => p.id === id)) this.pops = this.pops.filter((p) => p.id !== id);
  }

  land(foundation: number) {
    this.landed[foundation]++;
  }

  shake(card: number) {
    this.shaken = { id: ++seq, card };
    window.setTimeout(() => {
      if (this.shaken && this.shaken.card === card) this.shaken = null;
    }, 450);
  }

  open(m: Exclude<ModalName, null>) {
    this.modal = m;
  }
  close() {
    this.modal = null;
  }
}

export const ui = new UI();
