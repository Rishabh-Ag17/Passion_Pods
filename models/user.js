const mongoose = require("mongoose");
const Review = require("./review");
const Profile = require('./profile');
const { Schema, model } = mongoose; 

const ImgSchema = new Schema({
    url: String, 
    filename: String,
});
ImgSchema.virtual('thumbnail').get(function () {
    return this.url ? this.url.replace('/upload', '/upload/w_200') : '';
});
const opts = { 
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }, 
    timestamps: true 
};
const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    profileImageURL: [ImgSchema],
    hobbies: {
        type: [String], 
        default: [],    
    },
    description: {
        type: String,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'Profile',
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review',
        }
    ],
    geometry: {
        type: {
            type: String,
            enum : ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
}, opts); 
userSchema.virtual('properties.popUpMarkup').get(function () {
    return `
    <strong><a href="/campgrounds/${this._id}">${this.title}</a><strong>
    <p>${this.description.substring(0, 20)}...</p>`
});
userSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.deleteMany({
            _id: { $in: doc.reviews }
        });
    }
});

const User = model("User", userSchema); 

module.exports = User;
