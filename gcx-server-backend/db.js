const pg = require('pg');

pg.defaults.ssl = true;
pg.connect(process.env.DATABASE_URL, function(err, client) {
	if (err) throw err;
	console.log('Connected to postgres! Getting schemas...');

	client.query("SELECT * FROM location;")
		.on('row', function(row) {
			log(JSON.stringify(row));
		});
	
	function setLocation(user, latlng) {
		return new Promise(function (resolve, reject) {
			client.query('UPDATE $1')
			User.findOneAndUpdate({name: user}, {loc: latlng}, function (u) {
				resolve(u);
			});
		});
	};
	exports.setLocation = setLocation;
});
