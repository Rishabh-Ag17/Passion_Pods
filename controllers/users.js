const User = require("../models/user.js");
const Message = require('../models/messages');

async function stableMatching(users) {
    // Filter users who have at least one hobby
    users = users.filter(user => Array.isArray(user.hobbies) && user.hobbies.length > 0);

    // Set preferences based on shared hobbies
    users.forEach(user => {
        user.preferences = users
            .filter(other => other._id.toString() !== user._id.toString() &&
                other.hobbies.some(hobby => user.hobbies.includes(hobby)))
            .map(other => other._id.toString());
    });

    let freeUsers = users.map(user => user._id.toString());
    let proposals = new Map(users.map(user => [user._id.toString(), new Set()]));
    let matches = new Map();

    while (freeUsers.length > 0) {
        let proposerId = freeUsers.shift();
        let proposer = users.find(user => user._id.toString() === proposerId);

        if (!proposer || !Array.isArray(proposer.preferences) || proposer.preferences.length === 0) {
            // console.log(`Skipping user ${proposerId} - No valid preferences.`);
            continue;
        }

        for (let preferenceId of proposer.preferences) {
            if (proposals.get(proposerId).has(preferenceId)) continue;
            proposals.get(proposerId).add(preferenceId);

            let receiver = users.find(user => user._id.toString() === preferenceId);
            let currentMatch = matches.get(preferenceId);

            if (!receiver || !Array.isArray(receiver.hobbies) || receiver.hobbies.length === 0) {
                // console.log(`Skipping receiver ${preferenceId} - No hobbies found.`);
                continue;
            }

            if (!currentMatch) {
                matches.set(preferenceId, proposerId);
                matches.set(proposerId, preferenceId);
                break;
            } else {
                let receiverPreferences = receiver.preferences;
                if (receiverPreferences.indexOf(proposerId) < receiverPreferences.indexOf(currentMatch)) {
                    matches.set(proposerId, preferenceId);
                    matches.set(preferenceId, proposerId);
                    freeUsers.push(currentMatch);
                    break;
                }
            }
        }
    }
    return matches;
}


module.exports = {
    index : async (req, res) => {
        const users = await User.find({});
        res.render("users/index", { users });
    },

    renderNewForm : (req, res) => {
        res.render("users/new");
    },

    createUser: async (req, res, next) => {
        const { user } = req.body;
        // if (user.profileImageURL && user.profileImageURL.trim() !== "" && !isValidUrl(user.profileImageURL)) {
        //     throw new ExpressError("Invalid image URL provided", 400);
        // }
        // Convert hobbies from comma-separated string to an array
        if (user.hobbies && typeof user.hobbies === 'string') {
            user.hobbies = user.hobbies.split(',').map(hobby => hobby.trim());
        }
        const newUser = new User(user);
        newUser.profileImageURL = req.files.map(f => ({url: f.path, filename: f.filename}));
        newUser.author = req.user._id;
        await newUser.save();
        // console.log(newUser);
        req.flash('success', "Successfully added a new user!!");
        res.redirect(`/users/${newUser._id}`);
    },

    showUsers: async (req, res) => {
        const user = await User.findById(req.params.id).populate({path: 'reviews', populate: {path: 'author'}}).populate('author');
        if (!user) {
            req.flash('error', "Cannot find the user!!");
            return res.redirect('/users');
        }
        res.render("users/show", { user });
    },

    renderEditForm: async (req, res) => {
        const { id } = req.params;
        const user = await User.findById(id);
        // console.log(user);
        if (!user) {
            req.flash('error', "Cannot find the user!!");
            return res.redirect('/users');
        }
        if (!user.author || !user.author.equals(req.user._id)) {
            req.flash('error', "You do not have the permission to do that!!");
            return res.redirect(`/users/${id}`);
        }
        res.render("users/edit", { user });
    },

    // updateUsers: async (req, res) => {
    //     const { id } = req.params;
    //     const { user } = req.body;
    //     console.log(user);
    //     const user1 = await User.findById(id);
    //     if (!user1.author || !user1.author.equals(req.user._id)) {
    //         req.flash('error', "You do not have the permission to do that!!");
    //         return res.redirect(`/users/${id}`);
    //     }
    //     const newuser = await User.findByIdAndUpdate(id, { ...user });
    //     const imgs = req.files.map(f => ({url: f.path, filename: f.filename}));
    //     newuser.profileImageURL.push(...imgs);
    //     await newuser.save();
    //     req.flash('success', "Successfully updated the user!!");
    //     res.redirect(`/users/${id}`);
    // },
    updateUsers: async (req, res) => {
        const { id } = req.params;
        let { user } = req.body;
        // console.log(user);
    
        // Convert hobbies field from string to array.
        // If your input is a comma-separated string of hobbies:
        if (user.hobbies && typeof user.hobbies === 'string') {
            user.hobbies = user.hobbies.split(',').map(hobby => hobby.trim());
        }
        // Otherwise, if you expect just one hobby, you can do:
        // user.hobbies = [user.hobbies];
    
        const user1 = await User.findById(id);
        if (!user1.author || !user1.author.equals(req.user._id)) {
            req.flash('error', "You do not have the permission to do that!!");
            return res.redirect(`/users/${id}`);
        }
        
        // Update non-file fields and return the updated document
        const updatedUser = await User.findByIdAndUpdate(id, { ...user }, { new: true });
        
        // Only process image uploads if files are present
        if (req.files && req.files.length > 0) {
            const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
            updatedUser.profileImageURL.push(...imgs);
            await updatedUser.save();
        }
        
        req.flash('success', "Successfully updated the user!!");
        res.redirect(`/users/${id}`);
    },
    
    

    deleteUsers: async (req, res) => {
        const { id } = req.params;
        const user1 = await User.findById(id);
        if (!user1.author || !user1.author.equals(req.user._id)) {
            req.flash('error', "You do not have the permission to do that!!");
            return res.redirect(`/users/${id}`);
        }
        await User.findByIdAndDelete(id);
        req.flash('success', "Aww, we deleted the user!!");
        res.redirect("/users");
    },

    getMatches: async (req, res, next) => {
        try {
            const user = await User.findById(req.params.id);
    
            if (!user) {
                req.flash('error', "User not found.");
                return res.redirect('/users');
            }
    
            if (!Array.isArray(user.hobbies) || user.hobbies.length === 0) {
                req.flash('error', "You need to enter at least one hobby to find a match.");
                return res.redirect(`/users/${user._id}`);
            }
    
            const users = await User.find({});
            
            // console.log("Fetched Users:", users.map(u => ({
            //     id: u._id,
            //     hobbies: u.hobbies,
            //     preferences: u.preferences
            // })));
    
            const matches = await stableMatching(users);
            const userMatch = matches.get(req.params.id) || null;
    
            // console.log(`User ${req.params.id} best match:`, userMatch);
            res.json({ match: userMatch });
        } catch (err) {
            next(err);
        }
    },
    chat: async (req, res) => {
        const { userId } = req.params;
        const currentUserId = req.user._id;
      
        if (!req.user) {
          req.flash('error', "You must be logged in to chat.");
          return res.redirect('/login');
        }
      
        // Get message history between current user and chat partner
        const messages = await Message.find({
          $or: [
            { from: currentUserId, to: userId },
            { from: userId, to: currentUserId }
          ]
        }).sort({ timestamp: 1 });
      
        res.render('chat/chat', {
          chatPartnerId: userId,
          currentUserId,
          messages
        });
    },
       
    
};