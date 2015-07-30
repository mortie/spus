module.exports = function(ctx) {
	var id = parseInt(ctx.query);

	if (isNaN(id))
		return ctx.end(ctx.view("404"));

	ctx.db.query(
		"SELECT id, name, description, extension "+
		"FROM images "+
		"WHERE collection_id = $1",
		[id],
		queryCallback
	);

	function queryCallback(err, res) {
		if (err)
			return ctx.fail(err);

		if (!res.rows[0])
			return ctx.end(ctx.view("404"));

		var images = "";
		res.rows.forEach(function(row) {
			images += ctx.template("image", {
				title: row.name,
				id: row.id,
				extension: row.extension,
				description: row.description
			});
		});

		ctx.end(ctx.view("view", {
			images: images
		}));
	}
}
