import RepoInput from "../models/repoInputModel.js";
import connection from "../config/bullmq.config.js";
import { Queue } from 'bullmq';

async function addToQueue(email, repo_url) {
  try{
    const queue = new Queue('repo-index-queue', { connection });
    const job = await queue.add('repo-index', { email, repo_url });
    //console.log("Data added to queue:", job.data)
  } catch (err) {
    console.error("Add to queue error:", err);
    throw err;
  }
}

export async function saveRepoInput(req, res) {
  try {
    const { email, repo_url } = req.body;

    if (!email || !repo_url) {
      return res.status(400).json({ error: "Email and repo_url are required" });
    }
    const repoData = await RepoInput.create({ email, repo_url });
    await addToQueue(email, repo_url);
    res.status(201).json(repoData);
  } catch (err) {
    console.error("Save repo input error:", err);
    res.status(500).json({ 
      error: "Failed to save data",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
}

export async function getRepoInput(req, res) {
  try {
    const repo_id = req.params.repo_id;

    if (!repo_id) {
      return res.status(400).json({ error: "Repo id is required" });
    }

    const data = await RepoInput.findOne({ where: { repo_id } });
    
    if (!data) {
      return res.status(404).json({ error: "Repository data not found" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Get repo input error:", err);
    res.status(500).json({ 
      error: "Failed to get data",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
}

export async function getAllReposByEmail(req, res) {
  try {
    const email = req.params.email;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const repos = await RepoInput.findAll({ where: { email } });
    res.status(200).json(repos);
  } catch (err) {
    console.error("Get all repos error:", err);
    res.status(500).json({ 
      error: "Failed to get repos",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
}

export async function deleteRepo(req, res) {
  try {
    const repo_id = req.params.repo_id;

    if (!repo_id) {
      return res.status(400).json({ error: "Repo id is required" });
    }

    const deleted = await RepoInput.destroy({ where: { repo_id } });
    
    if (!deleted) {
      return res.status(404).json({ error: "Repository not found" });
    }

    res.status(200).json({ message: "Repository deleted successfully" });
  } catch (err) {
    console.error("Delete repo error:", err);
    res.status(500).json({ 
      error: "Failed to delete repository",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
}