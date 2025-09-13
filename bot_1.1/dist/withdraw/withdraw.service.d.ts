import { Model, Types } from 'mongoose';
import { Withdraw, WithdrawDocument } from '../schemas/withdraw.schema';
export declare class WithdrawService {
    private withdrawModel;
    constructor(withdrawModel: Model<WithdrawDocument>);
    create(createDto: any): Promise<WithdrawDocument>;
    approve(id: string, adminId: Types.ObjectId | string, amountUsdt?: null | number): Promise<import("mongoose").Document<unknown, {}, WithdrawDocument, {}> & Withdraw & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    reject(id: string, adminId: Types.ObjectId | string, reason?: string): Promise<import("mongoose").Document<unknown, {}, WithdrawDocument, {}> & Withdraw & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    findById(id: Types.ObjectId | string): Promise<import("mongoose").Document<unknown, {}, WithdrawDocument, {}> & Withdraw & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
