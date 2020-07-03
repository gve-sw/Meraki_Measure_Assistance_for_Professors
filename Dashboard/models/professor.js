let mongoose = require('mongoose');

// define schema to MongoDB
let professorSchema = mongoose.Schema({
	name: String,
	email: String,
	mac: String,
	timestamps: [{
		type: Date,
		ref: 'timestamp'
	}],
	aps: [{
		type: String,
		ref: 'ap'
	}]
});

// export the schema modules so we can call it in the main script
let Professor = module.exports = mongoose.model('Professor', professorSchema, 'Professor')
