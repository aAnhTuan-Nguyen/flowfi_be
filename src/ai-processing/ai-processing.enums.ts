export enum AiInputType {
  Audio = 'AUDIO',
  Image = 'IMAGE',
  Text = 'TEXT',
  Voice = 'VOICE',
}

export enum AiRequestType {
  VoiceToText = 'VOICE_TO_TEXT',
  VoiceToTransaction = 'VOICE_TO_TRANSACTION',
  Ocr = 'OCR',
  SpendingAnalysis = 'SPENDING_ANALYSIS',
}

export enum AiRequestStatus {
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

export enum AiImageType {
  Receipt = 'RECEIPT',
  BankTransfer = 'BANK_TRANSFER',
  Note = 'NOTE',
  Unknown = 'UNKNOWN',
}

export enum AiTransactionType {
  Expense = 'EXPENSE',
  Income = 'INCOME',
  Transfer = 'TRANSFER',
  Unknown = 'UNKNOWN',
}

export enum AiTag {
  Food = 'FOOD',
  Transport = 'TRANSPORT',
  Shopping = 'SHOPPING',
  Education = 'EDUCATION',
  Bills = 'BILLS',
  Income = 'INCOME',
  Other = 'OTHER',
}
