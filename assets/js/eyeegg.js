var API = {
  fetch: function(resource, callback) {
    console.log("Fetching " + resource);
    var prefix = 'https://www.eyeem.com/api/v2/',
        suffix = '&client_id=9oe7w4ImoXQcEP94vTJEk8pJuT2st366&callback=?';

    $.get( prefix + resource + suffix, function(data) {
    // $.getJSON('/test.json', function(data) {
      callback(data);
      console.log("Done");
    });
  }
};

var UI = (function() {
  var container = $('#browseUI'),
      showUI    = $('#showUI'),
      input     = $('.header__form input'),
      introUI   = $('#introUI'),
      header    = $('header'),
      body      = $('body'),
      albums = {},
      albumsContainer,
      navigateToAlbum,
      populateShowUI;

  var updateSearch = function(searchValue) {
    input.val(searchValue);
  };

  var loadingState = function() {
    body.addClass('loading');
  };

  var readyState = function() {
    body.removeClass('loading');
  };

  var displayAlbums = function(albumsData) {
    if (albumsContainer) {
      albumsContainer.remove();
    };

    albumsContainer = $('<ul class="browseUI__albumsContainer empty"></ul>').hide();
    albums = albumsData;
    albumsContainer.appendTo(container);

    _.each(albumsData, function(album) {
      var albumBox = $('<li class="albumBox"></li>');
      var title    = $('<div class="albumBox__title"></div>');
      var image    = $('<div class="albumBox__image"></div>');

      image.css('background-image', 'url(' + album.cover_thumb + ')');

      title.html(album.name);
      title.appendTo(albumBox);
      image.appendTo(albumBox);
      albumBox = albumBox.appendTo(albumsContainer);

      albums[URLify(album.name)] = album;
      albums[URLify(album.name)].el = albumBox;

      albumBox.click(function(e) {
        e.preventDefault();
        navigateToAlbum(album.eggID);
      });

      albumsContainer.show().removeClass('empty');

      introUI.fadeOut(300);
      header.removeClass('intro');
      // $.scrollTo(0, 500);
    });
  };

  var initialize = function(albumsData) {
    $('.citylink').click(function(e) {
      e.preventDefault();

      EGG.fetchPhotosFromAlbum($(this).attr('data-album-id'));
      updateSearch($(this).text());
    });

    $('header .logo').click(function(e) {
      e.preventDefault();
      albumsContainer.removeClass('hidden');
      showUI.addClass('hidden');
    });

    input.parent().submit(function(e) {
      e.preventDefault();
      EGG.fetchPhotosFromCity(input.val());
    });
  };

  navigateToAlbum = function(albumID) {
    albumsContainer.addClass('hidden');
    populateShowUI(albumID);
    showUI.removeClass('hidden');
  };

  populateShowUI = function(albumID) {
    showUI.html(" ");
    var albumData     = albums[albumID],
        showContainer = $('<div class="showUI__container"></div>'),
        title         = $('<h1 class="albumHeader"></h1>');

    title.html(albumData.name).appendTo(showUI);

    _.each(albumData.photos, function(photo) {
      photoContainer = $('<a class="showUI__photo" target="blank"></a>'),
      photoEl        = $('<img class="showUI__photoEl">');

      photoContainer.attr('href', photo.webUrl);
      photoEl.attr({
        src: photo.photoUrl,
        alt: photo.caption
      }).appendTo(photoContainer);

      photoContainer.appendTo(showContainer);
      photoEl.bind('load', function() {
        $(this).addClass('loaded');
      });

    });
    showContainer.appendTo(showUI);
    $.scrollTo(0, 500);
  };

  return {
    initialize: initialize,
    updateSearch: updateSearch,
    displayAlbums: displayAlbums,
    loadingState :loadingState,
    readyState : readyState
  };
})();

var EGG = (function() {
  var albums = {};
  var options = {
    maxDaysAgo: 10,
    fetchLimit: 500,
    minItems: 2,
    mergeAlbums: true,
    location: null
  };

  var _filterImages = function(photos) {
    albums = {};
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
          albums[albumID].eggID = albumID;
        }

        albums[albumID].photos.push(photo);
      }
    });

    albums = _.map(albums, function(album) {
      if (album.photos.length > options.minItems) {
        return {
          name: album.name,
          cover: album.photos[0].photoUrl,
          cover_thumb: album.photos[0].thumbUrl,
          eggID: album.eggID,
          updated: album.updated,
          photos: album.photos
        };
      }
    });

    return _.compact(albums);
    // TODO: should report it if there are no good results
  };

  var _getAlbumFromGeoLocation = function(geoposition) {
    var lat           = geoposition.coords.latitude,
        lon           = geoposition.coords.longitude,
        cityAlbum     = null,
        venueAlbum    = null,
        countryAlbum  = null;

    // Fetch other albums
    API.fetch('albums?geoSearch=nearbyVenues&lat=' + lat +'&lng=' + lon + '&limit=1', function(data) {
      venueAlbum    = data.albums.items[0];
      cityAlbum     = venueAlbum.location.cityAlbum;
      countryAlbum  = venueAlbum.location.countryAlbum;

      fetchPhotosFromAlbum(cityAlbum.id);
      UI.updateSearch(cityAlbum.name);
    });
  };

  var initialize = function() {
    var photoCollection;
    navigator.geolocation.getCurrentPosition(_getAlbumFromGeoLocation);
      UI.initialize(photoCollection);
  };

  var fetchPhotosFromAlbum = function(albumno) {
    UI.loadingState();
    // Fetch the photos
    API.fetch('albums/' + albumno + '/photos?detailed=1&limit='+options.fetchLimit+'&includeAlbums=1', function(data) {
      photoCollection = _filterImages(data.photos.items);
      UI.readyState();
      UI.displayAlbums(photoCollection);
    });
  };

  var fetchPhotosFromCity = function(cityName) {
    UI.loadingState();
    API.fetch('albums?q=' + cityName +'&geoSearch=city&limit=1&type=city', function(data) {
      fetchPhotosFromAlbum(data.albums.items[0].id);
    });
  };

  return {
    initialize: initialize,
    fetchPhotosFromAlbum: fetchPhotosFromAlbum,
    fetchPhotosFromCity: fetchPhotosFromCity
  };
})();
