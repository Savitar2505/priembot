"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAccountNumber = void 0;
const formatAccountNumber = (number, type) => {
    const last4 = number.slice(-4);
    return type === 'wallet' ? `...${last4}` : `*${last4}`;
};
exports.formatAccountNumber = formatAccountNumber;
//# sourceMappingURL=format-account.js.map