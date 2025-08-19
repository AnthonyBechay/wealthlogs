"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionType = exports.TradeStatus = exports.TradeDirection = exports.TradeType = exports.FinancialAccountType = void 0;
var FinancialAccountType;
(function (FinancialAccountType) {
    FinancialAccountType["FX_COMMODITY"] = "FX_COMMODITY";
    FinancialAccountType["STOCKS"] = "STOCKS";
    FinancialAccountType["CRYPTO"] = "CRYPTO";
    FinancialAccountType["REAL_ESTATE"] = "REAL_ESTATE";
    FinancialAccountType["PERSONAL_EXPENSES"] = "PERSONAL_EXPENSES";
    FinancialAccountType["BONDS"] = "BONDS";
    FinancialAccountType["ETFS"] = "ETFS";
    FinancialAccountType["CASH"] = "CASH";
    FinancialAccountType["PHYSICAL_COMMODITY"] = "PHYSICAL_COMMODITY";
    FinancialAccountType["BUSINESS"] = "BUSINESS";
    FinancialAccountType["VEHICLE"] = "VEHICLE";
    FinancialAccountType["OTHER"] = "OTHER";
})(FinancialAccountType || (exports.FinancialAccountType = FinancialAccountType = {}));
var TradeType;
(function (TradeType) {
    TradeType["FX"] = "FX";
    TradeType["STOCK"] = "STOCK";
    TradeType["BOND"] = "BOND";
    TradeType["CRYPTO"] = "CRYPTO";
    TradeType["ETF"] = "ETF";
    TradeType["OTHER"] = "OTHER";
})(TradeType || (exports.TradeType = TradeType = {}));
var TradeDirection;
(function (TradeDirection) {
    TradeDirection["LONG"] = "LONG";
    TradeDirection["SHORT"] = "SHORT";
})(TradeDirection || (exports.TradeDirection = TradeDirection = {}));
var TradeStatus;
(function (TradeStatus) {
    TradeStatus["OPEN"] = "OPEN";
    TradeStatus["CLOSED"] = "CLOSED";
    TradeStatus["CANCELLED"] = "CANCELLED";
})(TradeStatus || (exports.TradeStatus = TradeStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "DEPOSIT";
    TransactionType["WITHDRAW"] = "WITHDRAW";
    TransactionType["TRANSFER"] = "TRANSFER";
    TransactionType["DIVIDEND"] = "DIVIDEND";
    TransactionType["TRADE_PNL"] = "TRADE_PNL";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
