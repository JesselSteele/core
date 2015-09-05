/*
 * Copyright (c) 2015
 *
 * This file is licensed under the Affero General Public License version 3
 * or later.
 *
 * See the COPYING-README file.
 *
 */

(function() {
	if(!OC.Share) {
		OC.Share = {};
	}

	var TEMPLATE_BASE =
		'<div class="resharerInfoView"></div>' +
		'<label for="shareWith" class="hidden-visually">{{shareLabel}}</label>' +
		'<div class="oneline">' +
		'    <input id="shareWith" type="text" placeholder="{{sharePlaceholder}}" />' +
		'    <span class="shareWithLoading icon-loading-small hidden"></span>'+
		'</div>' +
			// FIXME: find a good position for remoteShareInfo
		'{{{remoteShareInfo}}}' +
		'<div class="shareeListView"></div>' +
		'<div class="linkShareView"></div>' +
		'<div class="expirationView"></div>'
		;

	var TEMPLATE_REMOTE_SHARE_INFO =
		'<a target="_blank" class="icon-info svg shareWithRemoteInfo hasTooltip" href="{{docLink}}" ' +
		'title="{{tooltip}}"></a>';

	/**
	 * @class OCA.Share.ShareDialogView
	 * @member {OC.Share.ShareItemModel} model
	 * @member {jQuery} $el
	 * @memberof OCA.Sharing
	 * @classdesc
	 *
	 * Represents the GUI of the share dialogue
	 *
	 */
	var ShareDialogView = OC.Backbone.View.extend({
		/** @type {Object} **/
		_templates: {},

		/** @type {boolean} **/
		_showLink: true,

		/** @type {string} **/
		tagName: 'div',

		/** @type {OC.Share.ShareConfigModel} **/
		configModel: undefined,

		/** @type {object} **/
		resharerInfoView: undefined,

		/** @type {object} **/
		linkShareView: undefined,

		/** @type {object} **/
		expirationView: undefined,

		/** @type {object} **/
		shareeListView: undefined,

		initialize: function(options) {
			var view = this;
			this.model.on('change', function() {
				view.render();
			});

			this.model.on('fetchError', function() {
				OC.Notification.showTemporary(t('core', 'Share details could not be loaded for this item.'));
			});

			if(!_.isUndefined(options.configModel)) {
				this.configModel = options.configModel;
			} else {
				throw 'missing OC.Share.ShareConfigModel';
			}

			var subViewOptions = {
				model: this.model,
				configModel: this.configModel
			};

			var subViews = {
				resharerInfoView: 'ShareDialogResharerInfoView',
				linkShareView: 'ShareDialogLinkShareView',
				expirationView: 'ShareDialogExpirationView',
				shareeListView: 'ShareDialogShareeListView'
			};

			for(var name in subViews) {
				var className = subViews[name];
				this[name] = _.isUndefined(options[name])
					? new OC.Share[className](subViewOptions)
					: options[name];
			}

			_.bindAll(this, 'autocompleteHandler');
		},

		autocompleteHandler: function (search, response) {
			var view = this;
			var $loading = this.$el.find('.shareWithLoading');
			$loading.removeClass('hidden');
			$loading.addClass('inlineblock');
			$.get(OC.filePath('core', 'ajax', 'share.php'), {
				fetch: 'getShareWith',
				search: search.term.trim(),
				limit: 200,
				itemShares: OC.Share.itemShares,
				itemType: view.model.get('itemType')
			}, function (result) {
				$loading.addClass('hidden');
				$loading.removeClass('inlineblock');
				if (result.status == 'success' && result.data.length > 0) {
					$("#shareWith").autocomplete("option", "autoFocus", true);
					response(result.data);
				} else {
					response();
				}
			}).fail(function () {
				$loading.addClass('hidden');
				$loading.removeClass('inlineblock');
				OC.Notification.show(t('core', 'An error occured. Please try again'));
				window.setTimeout(OC.Notification.hide, 5000);
			});
		},

		render: function() {
			var baseTemplate = this._getTemplate('base', TEMPLATE_BASE);

			this.$el.html(baseTemplate({
				shareLabel: t('core', 'Share'),
				sharePlaceholder: this._renderSharePlaceholderPart(),
				remoteShareInfo: this._renderRemoteShareInfoPart(),
			}));

			var view = this;
			this.$el.find('#shareWith').autocomplete({
				minLength: 2,
				delay: 750,
				source: this.autocompleteHandler,
				select: function(e, s) {
					var expiration = '';
					if($('#expirationCheckbox').is(':checked') === true) {
						expiration = view.$el.find('#expirationDate').val()
					}
					view.model.addShare(e, s, {
						expiration: expiration
					});
				}
			});

			this.resharerInfoView.$el = this.$el.find('.resharerInfoView');
			this.resharerInfoView.render();

			this.linkShareView.$el = this.$el.find('.linkShareView');
			this.linkShareView.render();

			this.expirationView.$el = this.$el.find('.expirationView');
			this.expirationView.render();

			this.shareeListView.$el = this.$el.find('.shareeListView');
			this.shareeListView.render();

			this.$el.find('.hasTooltip').tooltip();
			if(this.configModel.areAvatarsEnabled()) {
				this.$el.find('.avatar').each(function() {
					var $this = $(this);
					$this.avatar($this.data('username'), 32);
				});
				this.$el.find('.avatar.imageplaceholderseed').each(function() {
					var $this = $(this);
					$this.imageplaceholder($this.data('seed'));
				});
			}
			this.$el.find('.datepicker').datepicker({dateFormat : 'dd-mm-yy'});

			return this;
		},

		/**
		 * sets whether share by link should be displayed or not. Default is
		 * true.
		 *
		 * @param {bool} showLink
		 */
		setShowLink: function(showLink) {
			this._showLink = (typeof showLink === 'boolean') ? showLink : true;
			this.linkShareView.showLink = this._showLink;
		},

		_renderRemoteShareInfoPart: function() {
			var remoteShareInfo = '';
			if(this.configModel.isRemoteShareAllowed()) {
				var infoTemplate = this._getRemoteShareInfoTemplate();
				remoteShareInfo = infoTemplate({
					docLink: this.configModel.getFederatedShareDocLink(),
					tooltip: t('core', 'Share with people on other ownClouds using the syntax username@example.com/owncloud')
				});
			}

			return remoteShareInfo;
		},

		_renderSharePlaceholderPart: function () {
			var sharePlaceholder = t('core', 'Share with users or groups …');
			if (this.configModel.isRemoteShareAllowed()) {
				sharePlaceholder = t('core', 'Share with users, groups or remote users …');
			}
			return sharePlaceholder;
		},

		/**
		 *
		 * @param {string} key - an identifier for the template
		 * @param {string} template - the HTML to be compiled by Handlebars
		 * @returns {Function} from Handlebars
		 * @private
		 */
		_getTemplate: function (key, template) {
			if (!this._templates[key]) {
				this._templates[key] = Handlebars.compile(template);
			}
			return this._templates[key];
		},

		/**
		 * returns the info template for remote sharing
		 *
		 * @returns {Function}
		 * @private
		 */
		_getRemoteShareInfoTemplate: function() {
			return this._getTemplate('remoteShareInfo', TEMPLATE_REMOTE_SHARE_INFO);
		}
	});

	OC.Share.ShareDialogView = ShareDialogView;

})();
