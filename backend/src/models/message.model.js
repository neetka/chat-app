import mongoose from "mongoose"
const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref : "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // Optional if groupId is present
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: false,
        },
        text:{
            type: String,
        },
        image: {
            type: String,
        },
        ciphertext: {
            type: String,
        },
        iv: {
            type: String,
        },
        handshake: {
            type: Object,
        },
        senderDeviceId: {
            type: String,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "seen"],
            default: "sent",
        },
        expiresAt: {
            type: Date,
        },
        reactions: [
            {
                fromId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                emoji: {
                    type: String,
                    required: true,
                },
            },
        ],
    },
    {timestamps: true}
);

// Create a TTL index on the 'expiresAt' field
// The document will be automatically deleted when the current time equals 'expiresAt'
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Message = mongoose.model("Message", messageSchema);

export default Message;