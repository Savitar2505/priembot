import { Context, Telegraf } from 'telegraf';
import { UserService } from '../user/user.service';
import { GroupService } from '../group/group.service';
import { RequisiteService } from '../requisite/requisite.service';
import { WithdrawService } from '../withdraw/withdraw.service';
import { OperationService } from '../operation/operation.service';
export declare class BotUpdate {
    private readonly userService;
    private readonly groupService;
    private readonly requisiteService;
    private readonly withdrawService;
    private readonly operationService;
    private readonly bot;
    constructor(userService: UserService, groupService: GroupService, requisiteService: RequisiteService, withdrawService: WithdrawService, operationService: OperationService, bot: Telegraf<any>);
    start(ctx: Context): Promise<void>;
    private getRoleMenu;
    handleGroupAdded(ctx: Context): Promise<void>;
    handlePhoto(ctx: Context): Promise<void>;
    handleDocument(ctx: Context): Promise<void>;
    private handleGroupCheckDocument;
    private handleWithdrawChecks;
    private handleGroupCheckPhoto;
    handleSelectRequisite(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    requestAmount(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    cancelAmountInput(ctx: Context): Promise<void>;
    rejectCheck(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    showMyRequisites(ctx: Context): Promise<void>;
    showMyBalance(ctx: Context): Promise<void>;
    listReq(ctx: Context): Promise<void>;
    selectOperators(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    selectRequisite(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    toggleRequisite(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    saveRequisites(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    handleWithdrawGroupBalanceCommand(ctx: Context): Promise<void>;
    private isUserGroupAdmin;
    handleApproveGroupWithdraw(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    handleRejectGroupWithdraw(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    handleRejectWithdraw(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    handlePendingCommand(ctx: Context): Promise<void>;
    handleOpenCheck(ctx: Context & {
        match: any;
    }): Promise<void>;
    private notifyAdmins;
    handleConfirmWithdraw(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    handleText(ctx: Context, next: () => Promise<void>): Promise<void>;
    handleMigrate(ctx: Context): Promise<void>;
}
