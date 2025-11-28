import mongoose from 'mongoose';

import { IPrototypeData, IUser, IWorkspace } from '../src/types';

// IDs
const userId1 = new mongoose.Types.ObjectId();
const userId2 = new mongoose.Types.ObjectId();
const user1PersonalWorkspaceId = new mongoose.Types.ObjectId();
const user2PersonalWorkspaceId = new mongoose.Types.ObjectId();
const workspaceId3 = new mongoose.Types.ObjectId();
const workspaceId4 = new mongoose.Types.ObjectId();
const prototypeId1 = new mongoose.Types.ObjectId();
const prototypeId2 = new mongoose.Types.ObjectId();
const prototypeId3 = new mongoose.Types.ObjectId();
const prototypeId4 = new mongoose.Types.ObjectId();

// Users
const user1: IUser = {
    _id: userId1 as unknown as mongoose.Schema.Types.ObjectId,
    createdAt: new Date().toISOString(),
    email: 'test1@example.com',
    id: userId1.toString(),
    name: 'Test User 1',
    passwordHash: 'hashed-password',
    personalWorkspaceId: user1PersonalWorkspaceId.toString(),
    updatedAt: new Date().toISOString(),
};
const user2 = {
    ...user1,
    _id: userId2 as unknown as mongoose.Schema.Types.ObjectId,
    email: 'test2@example.com',
    id: userId2.toString(),
    name: 'Test User 2',
    personalWorkspaceId: user2PersonalWorkspaceId.toString(),
};

// Prototypes
const prototypeData1: IPrototypeData = {
    _id: prototypeId1 as unknown as mongoose.Schema.Types.ObjectId,
    changesMade: 'Updated JSON',
    creatorUserId: user1.id,
    designSystem: 'GOV.UK',
    firstPrompt: 'Describe your form',
    generatedFrom: 'text',
    id: prototypeId1.toString(),
    json: {
        before_you_start: 'Read this before you start.',
        changes_made: 'Initial creation',
        description: 'A test prototype form',
        duration: 10,
        explanation: 'This is a test explanation.',
        form_type: 'test',
        questions: [
            {
                answer_type: 'text',
                question_text: 'What is your name?',
                required: true,
            },
            {
                answer_type: 'text',
                question_text: 'What is your job role?',
                required: true,
            },
        ],
        suggestions: ['Add a question', 'Change the title'],
        title: 'Test Prototype 1',
        what_happens_next: 'You will see a confirmation page.',
    },
    livePrototypePublic: false,
    livePrototypePublicPassword: '',
    previousId: undefined,
    prompt: 'Create a form to ask for a name',
    sharedWithUserIds: [],
    timestamp: new Date().toISOString(),
    workspaceId: user1PersonalWorkspaceId.toString(),
};
const prototypeData2: IPrototypeData = {
    ...prototypeData1,
    _id: prototypeId2 as unknown as mongoose.Schema.Types.ObjectId,
    id: prototypeId2.toString(),
    json: {
        ...prototypeData1.json,
        changes_made: 'Updated to prototype 2',
        questions: [
            {
                answer_type: 'text',
                next_question_value: 2,
                question_text: 'What is your name?',
                required: true,
            },
            {
                answer_type: 'text',
                next_question_value: -1,
                question_text: 'What is your job role?',
                required: true,
            },
        ],
        title: 'Test Prototype 2',
    },
    previousId: prototypeId1.toString(),
    workspaceId: workspaceId3.toString(),
};
const prototypeData3 = {
    ...prototypeData1,
    _id: prototypeId3 as unknown as mongoose.Schema.Types.ObjectId,
    creatorUserId: userId2.toString(),
    id: prototypeId3.toString(),
    json: {
        ...prototypeData1.json,
        questions: [
            {
                answer_type: 'branching_choice',
                next_question_value: 2,
                options_branching: [
                    {
                        next_question_value: 2,
                        text_value: 'Yes',
                    },
                    {
                        next_question_value: -1,
                        text_value: 'No',
                    },
                ],
                question_text: 'Do you have a job?',
                required: true,
            },
            {
                answer_type: 'text',
                next_question_value: -1,
                options: [],
                question_text: 'What is your job role?',
                required: true,
            },
        ],
        title: 'Test Prototype 3',
    },
    livePrototypePublic: true,
    sharedWithUserIds: [userId2.toString()],
    workspaceId: workspaceId3.toString(),
};
const prototypeData4: IPrototypeData = {
    ...prototypeData1,
    _id: prototypeId4 as unknown as mongoose.Schema.Types.ObjectId,
    creatorUserId: userId2.toString(),
    id: prototypeId4.toString(),
    json: {
        ...prototypeData1.json,
        title: 'Test Prototype 4',
    },
    livePrototypePublic: true,
    livePrototypePublicPassword: 'password123',
    sharedWithUserIds: [],
    workspaceId: new mongoose.Types.ObjectId().toString(),
};

// Workspaces
const user1PersonalWorkspace: IWorkspace = {
    _id: user1PersonalWorkspaceId as unknown as mongoose.Schema.Types.ObjectId,
    createdAt: new Date().toISOString(),
    id: user1PersonalWorkspaceId.toString(),
    isPersonalWorkspace: true,
    name: 'Test User 1 Personal Workspace',
    updatedAt: new Date().toISOString(),
    userIds: [user1.id],
};
const user2PersonalWorkspace: IWorkspace = {
    ...user1PersonalWorkspace,
    _id: user2PersonalWorkspaceId as unknown as mongoose.Schema.Types.ObjectId,
    id: user2PersonalWorkspaceId.toString(),
    name: 'Test User 2 Personal Workspace',
    userIds: [user2.id],
};
const workspace3: IWorkspace = {
    _id: workspaceId3 as unknown as mongoose.Schema.Types.ObjectId,
    createdAt: new Date().toISOString(),
    id: workspaceId3.toString(),
    isPersonalWorkspace: false,
    name: 'Workspace Three',
    updatedAt: new Date().toISOString(),
    userIds: [user1.id, new mongoose.Types.ObjectId().toString()],
};
const workspace4: IWorkspace = {
    ...workspace3,
    _id: workspaceId4 as unknown as mongoose.Schema.Types.ObjectId,
    id: workspaceId4.toString(),
    name: 'Workspace Four',
    userIds: [user1.id],
};

// Collections of all
const allUsers = [user1, user2];
const allPrototypes: IPrototypeData[] = [
    prototypeData1,
    prototypeData2,
    prototypeData3,
    prototypeData4,
];
const allWorkspaces: IWorkspace[] = [
    user1PersonalWorkspace,
    user2PersonalWorkspace,
    workspace3,
    workspace4,
];

export {
    allPrototypes,
    allUsers,
    allWorkspaces,
    prototypeData1,
    prototypeData2,
    prototypeData3,
    prototypeData4,
    prototypeId1,
    prototypeId2,
    prototypeId3,
    prototypeId4,
    user1,
    user1PersonalWorkspace,
    user1PersonalWorkspaceId,
    user2,
    user2PersonalWorkspace,
    user2PersonalWorkspaceId,
    userId1,
    userId2,
    workspace3,
    workspace4,
    workspaceId3,
    workspaceId4,
};
