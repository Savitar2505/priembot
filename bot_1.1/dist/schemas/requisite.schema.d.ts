import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
export declare class Requisite {
    _id: Types.ObjectId;
    name: string;
    owner: string;
    type: string;
    account_number: string;
    operator_id: Types.ObjectId | null;
    balance: number;
    is_active: boolean;
    description: string | null;
}
export type RequisiteDocument = Requisite & mongoose.Document;
export declare const RequisiteSchema: mongoose.Schema<Requisite, mongoose.Model<Requisite, any, any, any, mongoose.Document<unknown, any, Requisite, any> & Requisite & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Requisite, mongoose.Document<unknown, {}, mongoose.FlatRecord<Requisite>, {}> & mongoose.FlatRecord<Requisite> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
