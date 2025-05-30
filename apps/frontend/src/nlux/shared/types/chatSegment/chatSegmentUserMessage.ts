export type ChatSegmentUserMessage = {
    uid: string;
    time: Date;
    status: 'complete';
    participantRole: 'user';
    content: string;
    contentType: 'text' | 'email_input';
};
