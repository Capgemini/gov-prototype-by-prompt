import {
    ITemplateData,
    PrototypeDesignSystemsType,
} from './schemas/prototype-schema';
import { IUser } from './schemas/user-schema';
import { IWorkspace } from './schemas/workspace-schema';

// UI-related types
export interface ResultsTemplatePayload {
    additionalCountPreviousPrototypes: number;
    allUsers: IUser[];
    allWorkspaces: { selected: boolean; text: string; value: string }[];
    designSystem: PrototypeDesignSystemsType;
    enableSuggestions: boolean;
    explanation?: string;
    firstPrompt: string;
    isLivePrototypePublic: boolean;
    isOwner: boolean;
    json: ITemplateData;
    jsonSchema: string;
    jsonText: string;
    livePrototypePublicPassword: string;
    livePrototypeUrl: string;
    previousPrototypesRows: { html: string }[][];
    prototypeId: string;
    prototypeTitle: string;
    sharedWithUsers: IUser[];
    showJsonPrompt: boolean;
    totalCountPreviousPrototypes: number;
    workspace: IWorkspace;
}
