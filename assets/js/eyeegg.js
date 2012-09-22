var API = {
  fetch: function(resource, callback) {
    console.log("Fetching " + resource);
    var prefix = 'https://www.eyeem.com/api/v2/',
        suffix = '&client_id=9oe7w4ImoXQcEP94vTJEk8pJuT2st366&callback=?';

    // $.get( prefix + resource + suffix, function(data) {
    $.getJSON('/test.json', function(data) {
      callback(data);
      console.log("Done");
    });
  }
};

var UI = (function() {
  var container = $('#browseUI');
  var albums = {};

  var initialize = function(albumsData) {
    var albumsContainer = $('<ul class="browseUI__albumsContainer"></ul>');
    albums = albumsData;
    albumsContainer.appendTo(container);

    _.each(albumsData, function(album) {
      var albumBox = $('<li class="albumBox"></li>');
      var title    = $('<div class="albumBox__title"></div>');

      albumBox.attr({
        'data-name' : album.name,
        'style'     : 'background-image: url(' + album.cover + ')'
      });

      title.html(album.name);
      title.appendTo(albumBox);
      albumBox = albumBox.appendTo(albumsContainer);

      albums[URLify(album.name)] = album;
      albums[URLify(album.name)].el = albumBox;
    });
    // TODO: add links
  };

  return {
    initialize: initialize
  };
})();

var EGG = (function() {
  var albums = {};
  var options = {
    maxDaysAgo: 4,
    fetchLimit: 100,
    minItems: 2,
    mergeAlbums: true
  };

  var _filterImages = function(photos) {
    var maxAge = new Date().setDate(new Date().getDate()-options.maxDaysAgo);

    _.each(photos, function(photo) {
      var photoDate   = new Date(photo.updated).getTime(),
          photoAlbums = photo.albums.items,
          tagAlbum    = null,
          albumID     = null;

      // If this photo belongs to a tag album, mark that
      _.each(photoAlbums, function(album) {
        if (album.type === "tag") {
          tagAlbum = album;
        }
      });

      // Check if the photo isn't too old,
      // and that it belongs to a tag album, if so, add it to album
      if (photoDate > maxAge && tagAlbum !== null) {
        if (options.mergeAlbums) {
          albumID = URLify(tagAlbum.name);
        } else {
          albumID = tagAlbum.id;
        }
        // Add the album to the album list
        if (!albums[albumID]) {
          albums[albumID] = tagAlbum;
          albums[albumID].photos = [];
        }

        albums[albumID].photos.push(photo);
      }
    });

    albums = _.map(albums, function(album) {
      if (album.photos.length > options.minItems) {
        return {
          name: album.name,
          cover: album.photos[0].photoUrl,
          first: album.photos[0].thumbUrl,
          updated: album.updated,
          photos: album.photos
        };
      }
    });

    return _.compact(albums);
  };

  var initialize = function() {
    var photoCollection;

    // Fetch the photos
    API.fetch('albums/17/photos?detailed=1&limit='+options.fetchLimit+'&includeAlbums=1', function(data) {
      photoCollection = _filterImages(data.photos.items);
      UI.initialize(photoCollection);
      console.log(albums);
    });
  };

  return {
    initialize: initialize
  };
})();
