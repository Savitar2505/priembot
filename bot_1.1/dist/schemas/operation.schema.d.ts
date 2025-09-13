import * as mongoose from 'mongoose';
import { Document, Types } from 'mongoose';
export declare enum OperationStatuses {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare class Operation extends Document {
    group_id: Types.ObjectId;
    requisite_id: Types.ObjectId;
    group_chat_id: number;
    original_message_id: number;
    group_message_id: number;
    operator_id: Types.ObjectId;
    photo_file_id: string;
    document_file_id: string;
    status: string;
    created_at: Date;
    updated_at: Date;
}
export type OperationDocument = Operation & mongoose.Document;
export declare const OperationSchema: mongoose.Schema<Operation, mongoose.Model<Operation, any, any, any, mongoose.Document<unknown, any, Operation, any> & Operation & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Operation, mongoose.Document<unknown, {}, mongoose.FlatRecord<Operation>, {}> & mongoose.FlatRecord<Operation> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
