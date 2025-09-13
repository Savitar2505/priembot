import { Model, Types } from 'mongoose';
import { Operation, OperationDocument } from '../schemas/operation.schema';
export declare class OperationService {
    private readonly operationModel;
    constructor(operationModel: Model<OperationDocument>);
    create(operationData: Partial<Operation>): Promise<import("mongoose").Document<unknown, {}, OperationDocument, {}> & Operation & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    findById(id: string): Promise<import("mongoose").Document<unknown, {}, OperationDocument, {}> & Operation & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    findPendingOperationById(id: Types.ObjectId | string): Promise<import("mongoose").Document<unknown, {}, OperationDocument, {}> & Operation & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    findPending(operatorId: Types.ObjectId | string): Promise<(import("mongoose").Document<unknown, {}, OperationDocument, {}> & Operation & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    delete(id: string): Promise<import("mongoose").Document<unknown, {}, OperationDocument, {}> & Operation & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    update(id: Types.ObjectId | string, dto: any): Promise<import("mongoose").Document<unknown, {}, OperationDocument, {}> & Operation & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    approve(id: Types.ObjectId | string): Promise<import("mongoose").Document<unknown, {}, OperationDocument, {}> & Operation & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    reject(id: Types.ObjectId | string): Promise<import("mongoose").Document<unknown, {}, OperationDocument, {}> & Operation & import("mongoose").Document<unknown, any, any, Record<string, any>> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
