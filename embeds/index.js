'use strict';

const colors = require('./tokens/colors');
const zeroWidth = require('./tokens/zeroWidth');
const brand = require('./tokens/brand');
const avatar = require('./tokens/avatar');
const table = require('./tokens/table');
const timestamp = require('./tokens/timestamp');
const divider = require('./tokens/divider');

const author = require('./factories/author');
const footer = require('./factories/footer');
const base = require('./factories/base');
const clean = require('./factories/clean');
const field = require('./factories/field');

const Success = require('./status/Success');
const Error = require('./status/Error');
const Warning = require('./status/Warning');
const Info = require('./status/Info');
const System = require('./status/System');
const NoPerm = require('./status/NoPerm');
const Cooldown = require('./status/Cooldown');
const ConfirmPrompt = require('./status/ConfirmPrompt');

const DashboardPanel = require('./panels/DashboardPanel');
const AdminRecord = require('./panels/AdminRecord');
const HeavyData = require('./panels/HeavyData');
const PlayerCard = require('./panels/PlayerCard');
const TicketPanel = require('./panels/TicketPanel');
const TicketWelcome = require('./panels/TicketWelcome');
const HelpHub = require('./panels/HelpHub');

const buttons = require('./components/buttons');
const selectMenus = require('./components/selectMenus');
const modals = require('./components/modals');

const TicketReasonModal = require('./modals/TicketReasonModal');
const BanReasonModal = require('./modals/BanReasonModal');
const VouchMessageModal = require('./modals/VouchMessageModal');

module.exports = {
  tokens: { colors, zeroWidth, brand, avatar, table, timestamp, divider },
  factories: { author, footer, base, field, clean },

  success: Success.success,
  error: Error.error,
  warning: Warning.warning,
  info: Info.info,
  system: System.system,
  processing: System.processing,
  noPerm: NoPerm.noPerm,
  cooldown: Cooldown.cooldown,
  confirmPrompt: ConfirmPrompt.confirmPrompt,

  DashboardPanel: DashboardPanel.DashboardPanel,
  AdminRecord: AdminRecord.AdminRecord,
  HeavyData: HeavyData.HeavyData,
  PlayerCard: PlayerCard.PlayerCard,
  TicketPanel: TicketPanel.TicketPanel,
  TicketWelcome: TicketWelcome.TicketWelcome,
  HelpHub: HelpHub.HelpHub,
  HelpCategory: HelpHub.HelpCategory,

  buttons,
  selectMenus,
  modals,

  TicketReasonModal: TicketReasonModal.TicketReasonModal,
  BanReasonModal: BanReasonModal.BanReasonModal,
  VouchMessageModal: VouchMessageModal.VouchMessageModal,
};
