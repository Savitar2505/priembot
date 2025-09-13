import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
export declare class Group {
    _id: Types.ObjectId;
    title: string;
    telegram_group_id: string;
    operator_ids: Types.ObjectId[];
    balance: number;
}
export type GroupDocument = Group & mongoose.Document;
export declare const GroupSchema: mongoose.Schema<Group, mongoose.Model<Group, any, any, any, mongoose.Document<unknown, any, Group, any> & Group & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Group, mongoose.Document<unknown, {}, mongoose.FlatRecord<Group>, {}> & mongoose.FlatRecord<Group> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
