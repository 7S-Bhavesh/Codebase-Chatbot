import Chat from "../models/chatModel.js";

export async function getChat(req, res){
    try{
        const chat_id = req.params.chat_id;

        if (!chat_id) {
            return res.status(400).json({ error: "Chat id is required" });
        }
    
        const data = await Chat.findOne({ where: { chat_id } });
        
        if (!data) {
            return res.status(404).json({ error: "Chat not found" });
        }
    
        res.status(200).json(data);
    }
    catch(err){
        console.error("Get chat error:", err);
        res.status(500).json({ 
        error: "Failed to get chat",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
}

export async function getAllChatsByRepo(req, res){
    try{
        const repo_id = req.params.repo_id;

        if (!repo_id) {
            return res.status(400).json({ error: "Repo id is required" });
        }
    
        const chats = await Chat.findAll({ 
            where: { repo_id },
            order: [['created_at', 'DESC']]
        });
    
        res.status(200).json(chats);
    }
    catch(err){
        console.error("Get all chats error:", err);
        res.status(500).json({ 
        error: "Failed to get chats",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
}