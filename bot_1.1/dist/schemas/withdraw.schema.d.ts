import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
export declare enum WithdrawStatuses {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare class Withdraw {
    target_type: string;
    operator?: Types.ObjectId;
    requisite?: Types.ObjectId;
    group?: Types.ObjectId;
    amount: number;
    amount_usdt?: number;
    status: string;
    admin?: Types.ObjectId;
    reject_reason?: string;
}
export type WithdrawDocument = Withdraw & mongoose.Document;
export declare const WithdrawSchema: mongoose.Schema<Withdraw, mongoose.Model<Withdraw, any, any, any, mongoose.Document<unknown, any, Withdraw, any> & Withdraw & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Withdraw, mongoose.Document<unknown, {}, mongoose.FlatRecord<Withdraw>, {}> & mongoose.FlatRecord<Withdraw> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
