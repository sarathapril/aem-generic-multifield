/**
 * The Namics.GenericMultiField class represents an editable list
 * of form fields for editing multi value properties.
 */
(function($) {
	"use strict";

	var addButton =
		"<button type=\"button\" class=\"js-coral-GenericMultiField-add coral-GenericMultiField-add coral-MinimalButton\">" +
		"<i class=\"coral-Icon coral-Icon--sizeS coral-Icon--addCircle coral-MinimalButton-icon\"></i>" +
		"</button>";
	var removeButton =
		"<button type=\"button\" class=\"js-coral-GenericMultiField-remove coral-GenericMultiField-remove coral-MinimalButton\">" +
		"<i class=\"coral-Icon coral-Icon--sizeS coral-Icon--delete coral-MinimalButton-icon\"></i>" +
		"</button>";
	var moveButton =
		"<button type=\"button\" class=\"js-coral-GenericMultiField-move coral-GenericMultiField-move coral-MinimalButton\">" +
		"<i class=\"coral-Icon coral-Icon--sizeS coral-Icon--moveUpDown coral-MinimalButton-icon\"></i>" +
		"</button>";
	var editButton =
		"<button type=\"button\" class=\"js-coral-GenericMultiField-edit coral-GenericMultiField-edit coral-MinimalButton\">" +
		"<i class=\"coral-Icon coral-Icon--sizeS coral-Icon--edit coral-MinimalButton-icon\"></i>" +
		"</button>";


	/**
	 * The Namics.GenericMultiField class represents an editable list
	 * of form fields for editing multi value properties.
	 *
	 * @extends CUI.Widget
	 */
	Namics.GenericMultiField = new Class({

		toString: 'GenericMultiField',

		extend: CUI.Widget,

		/**
		 * Creates a new Namics.GenericMultiField.
		 * @constructor
		 * @param options object containing config properties
		 */
		construct: function(options) {
			this.ol = this.$element.children("ol");

			// is needed for IE9 compatibility
			var opt = this.$element.get()[0];
			// get config properties
			this.itemDialog = options.itemdialog || opt.getAttribute('data-itemdialog');
			this.itemStorageNode = options.itemstoragenode || opt.getAttribute('data-itemstoragenode') || "items";
			this.itemNameProperty = options.itemnameproperty || opt.getAttribute('data-itemnameproperty') || "jcr:title";
			this.itemNameDisplayStrategy = options.itemnamedisplaystrategy || opt.getAttribute('data-itemnamedisplaystrategy');
			this.minElements = options.minelements || opt.getAttribute('data-minelements');
			this.maxElements = options.maxelements || opt.getAttribute('data-maxelements');
			this.readOnly = options.renderreadonly || opt.getAttribute('data-renderreadonly');

			// get the crx path of the current component from action attribute of the current form.
			this.crxPath = this.$element.parents("form").attr("action");

			if (!this.readOnly){
				// add the "+" button for adding new items
				this.ol.after(addButton);
				// add button listeners
				this._addListeners();
			}
			// get list elements
			this._updateList(false);
		},

		/**
		 * Performs an ajax call to the storage node and updates the list entries.
		 * @param triggerEvent (Boolean) If "change" event should be triggered.
		 * @private
		 */
		_updateList: function(triggerEvent){
			var that = this;
			$.ajax({
				type: "GET",
				dataType: "json",
				url: that.crxPath + "/" + that.itemStorageNode + ".-1.json"
			}).done(function(data) {
				that.ol.empty();
				$.each(data,function(key){
					if (typeof data[key] === 'object'){

						if(that.itemNameDisplayStrategy === "pageTitle"){
							//use the jcr:title from a page
							that._labelFromPage(key,data[key][that.itemNameProperty]);
						} else {
							var propertyValue;
							if(that.itemNameProperty.indexOf('/') > -1){
								propertyValue = that.itemNameProperty.split('/');
								var parent = data[key];
								for (var i = 0; i < propertyValue.length -1; i += 1) {
									parent = parent[propertyValue[i]];
								}
								propertyValue = parent[propertyValue[propertyValue.length-1]];
							}else {
								propertyValue = data[key][that.itemNameProperty];
							}
							var li = that._createListEntry(key, propertyValue);
							li.appendTo(that.ol);
						}

					}
				});
				// trigger change event on update of items
				if (triggerEvent === true) {
					that._triggerChangeEvent();
				}
			});
		},

		_labelFromPage: function(key,targetPath){
			var that = this;
			$.ajax({
				type: "GET",
				dataType: "json",
				async: false,
				url: targetPath + ".-1.json"
			}).done(function(data) {

				if (typeof data["jcr:content"] === 'object'){
					var li = that._createListEntry(key, data["jcr:content"]["jcr:title"]);
					li.appendTo(that.ol);
				}

			});

		},

		/**
		 * Creates the markup for a single list entry.
		 * @private
		 * @param key the name of the current item
		 * @param label the label of the current item
		 */
		_createListEntry: function(key, label){
			var escapedLabel = $("<div/>").text(label).html();
			var labelWithKeyAsFallback = escapedLabel ? escapedLabel : key;
			var li = null;
			if (!this.readOnly){
				li = $("<li id=" + key + " title=" + labelWithKeyAsFallback + " class='coral-GenericMultiField-listEntry'>" + "<div class='coral-GenericMultiField-label'>" + labelWithKeyAsFallback + "</div></li>");
				li.append($(removeButton));
				li.append(editButton);
				li.append(moveButton);
			}
			else{
				li = $("<li class='coral-List-item' title=" + labelWithKeyAsFallback + ">" + labelWithKeyAsFallback + "</li>");
			}
			return li;
		},

		/**
		 * Initializes listeners.
		 * @private
		 */
		_addListeners: function () {
			var that = this;

			this.$element.on("click", ".js-coral-GenericMultiField-add", function (e) {
				that._addNewItem();
			});

			this.$element.on("click", ".js-coral-GenericMultiField-remove", function (e) {
				var currentItem = $(this).closest("li");
				that._removeItem(currentItem);
			});

			this.$element.on("click", ".js-coral-GenericMultiField-edit", function (e) {
				var currentItem = $(this).closest("li");
				that._editItem(currentItem);
			});


			this.$element
				.fipo("taphold", "mousedown", ".js-coral-GenericMultiField-move", function (e) {
					e.preventDefault();

					var item = $(this).closest("li");
					item.prevAll().addClass("drag-before");
					item.nextAll().addClass("drag-after");

					// Fix height of list element to avoid flickering of page
					that.ol.css({height: that.ol.height() + $(e.item).height() + "px"});
					new CUI.DragAction(e, that.$element, item, [that.ol], "vertical");
				})
				.on("dragenter", function (e) {
					that.ol.addClass("drag-over");
					that._reorderPreview(e);
				})
				.on("dragover", function (e) {
					that._reorderPreview(e);
				})
				.on("dragleave", function (e) {
					that.ol.removeClass("drag-over").children().removeClass("drag-before drag-after");
				})
				.on("drop", function (e) {
					that._reorder($(e.item));
					that.ol.children().removeClass("drag-before drag-after");
				})
				.on("dragend", function (e) {
					that.ol.css({height: ""});
				});

		},

		/**
		 * Opens the edit dialog for a given item id.
		 * If the item id is not defined, a empty dialog for a new item is loaded.
		 * @param itemPath the path of the current item
		 * @private
		 */
		_openEditDialog: function(itemPath, cancelCallback){
			if (!itemPath) {
				throw new Error("Parameter 'itemPath' must be defined");
			}

			var that = this,
				path = this.itemDialog + ".html" + itemPath;

			var dialog = {
				getConfig: function () {
					return {
						src: path,
						itemPath: Namics.Helper.manglePath(itemPath),
						loadingMode: "auto",
						layout: "auto",
						isGenericMultifield:true
					};
				},
				getRequestData: function () {
					return {};
				},
				onSuccess: function () {
					that._updateList(true);
					return $.Deferred().promise();
				},
				onCancel: cancelCallback
			}
			Namics.GenericMultifieldDialogHandler.openDialog(dialog);
		},

		/**
		 * Edits an item by opening the item dialog.
		 * @param item List item to be edited
		 * @private
		 */
		_editItem: function(item) {
			var path = this.crxPath + "/" + this.itemStorageNode + "/" + item.attr("id");
			this._openEditDialog(path);
		},

		/**
		 * Adds a new item by opening the empty item dialog if maxElements is not reached.
		 * Otherwise, a warning dialog is displayed.
		 * @private
		 */
		_addNewItem: function(){
			var that = this;
			var currentElements = this.$element.find("li").length;

			if (!this.maxElements || (currentElements < this.maxElements)){
				this._createNode(this.crxPath + "/" + this.itemStorageNode + "/*", function(path) {
					that._openEditDialog(path, function(event, dialog) {
					  that._deleteNode(path, function() {
					  	// call update list after successful deletion of node
						  that._updateList(true);
					  });
					});
				});
			}
			else{
				$(".genericmultifield-maxelements-notice").modal({
					type: "notice",
					buttons: [{
						label: Granite.I18n.get("OK"),
						className: "coral-Button",
						click: function(evt) {
							this.hide();
							$(".genericmultifield-maxelements-notice").modal("hide");
						}
					}]
				}).modal("show");
			}
		},

		/**
		 * Removes an item from the list. Shows a warning dialog ("Cancel","Delete") before the delete action is executed.
		 * @private
		 * @param item the list item to be deleted
		 */
		_removeItem: function(item){
			var that = this,
				currentElements = this.$element.find("li").length;

			if (!this.minElements || (currentElements > this.minElements)){
				$(".genericmultifield-deleteitem-notice").modal({
					type: "notice",
					buttons: [{
						label: Granite.I18n.get("Cancel"),
						className: "coral-Button",
						click: function(evt) {
							this.hide();
							$(".genericmultifield-deleteitem-notice").modal("hide");
						}
					},
						{
							label: Granite.I18n.get("Delete"),
							className: "coral-Button coral-Button--warning",
							click: function(evt) {
								this.hide();
								$(".genericmultifield-deleteitem-notice").modal("hide");
								if (currentElements == 1) {
									// delete whole itemStorageNode if last item is being removed
									that._deleteNode(that.crxPath + "/" + that.itemStorageNode, deleteItemCallback);
								} else {
									that._deleteNode(that.crxPath + "/" + that.itemStorageNode + "/" + item.attr("id"), deleteItemCallback);
								}
							}
						}]
				}).modal("show");
			}
			else{
				$(".genericmultifield-minelements-notice").modal({
					type: "notice",
					buttons: [{
						label: Granite.I18n.get("OK"),
						className: "coral-Button",
						click: function(evt) {
							this.hide();
							$(".genericmultifield-minelements-notice").modal("hide");
						}
					}]
				}).modal("show");
			}

			// remove item from DOM on successful callback
			function deleteItemCallback(path) {
				item.remove();
			}
		},

		/**
		 * Performs drag and drop reordering and executes a sling reordering request on crx items.
		 * @private
		 * @param item the dragging item
		 */
		_reorder: function (item) {
			var before = this.ol.children(".drag-after").first();
			var after = this.ol.children(".drag-before").last();


			if (before.length > 0) {
				item.insertBefore(before);
				$.ajax({
					type: "POST",
					data: ":order=before " + before.attr("id"),
					url: this.crxPath +"/" + this.itemStorageNode + "/" + item.attr("id")
				});
			}
			else if (after.length > 0) {
				item.insertAfter(after);
				$.ajax({
					type: "POST",
					data: ":order=after " + after.attr("id"),
					url: this.crxPath + "/" + this.itemStorageNode + "/" + item.attr("id")
				});

			};

		},

		/**
		 * Creates a preview view on drag and drop reordering action.
		 * @private
		 * @param e the event object
		 */
		_reorderPreview: function (e) {
			var pos = this._pagePosition(e);
			this.ol.children(":not(.is-dragging)").each(function () {
				var el = $(this);
				var isAfter = pos.y < (el.offset().top + el.outerHeight() / 2);
				el.toggleClass("drag-after", isAfter);
				el.toggleClass("drag-before", !isAfter);
			});
		},

		/**
		 * gets the page position.
		 * @private
		 * @param e the event object
		 */
		_pagePosition: function (e) {
			var touch = {};
			if (e.originalEvent) {
				var o = e.originalEvent;
				if (o.changedTouches && o.changedTouches.length > 0) {
					touch = o.changedTouches[0];
				}
				if (o.touches && o.touches.length > 0) {
					touch = o.touches[0];
				}
			}

			return {
				x: touch.pageX || e.pageX,
				y: touch.pageY || e.pageY
			};
		},

		/**
		 * Creates a new node at given path
		 * @param (String) path Path of node to be deleted
		 * @return (String) Path of node that has been created
		 * @private
		 */
		_createNode: function (path, callback) {
			$.ajax({
				type: "POST",
				headers: {          
			    Accept: "application/json,**/**;q=0.9"   
			  },
				url: path
			}).done(function(data) {
				if ($.isFunction(callback)) {
					if (data && data.path) {
						callback(data.path);
					}
				}
			});
		},

		/**
		 * Deletes the node at given path
		 * @param (String) path Path of node to be deleted
		 * @return (String) Path of node that has been deleted
		 * @private
		 */
		_deleteNode: function (path, callback) {
			$.ajax({
				type: "POST",
				data: ":operation=delete",
				url: path
			}).done(function(data) {
				if ($.isFunction(callback)) {
					callback(path);
				}
			});
		},

		/**
		 * Triggers the change event with the DOM element as the source.
		 * @private
		 */
		_triggerChangeEvent: function () {
			this.$element.trigger("change");
		}
	});

	// put Namics.GenericMultiField on widget registry
	CUI.Widget.registry.register(" ", Namics.GenericMultiField);

	// Data API
	if (CUI.options.dataAPI) {
		$(document).on("cui-contentloaded.data-api", function(e) {
			$(".coral-GenericMultiField[data-init~='genericmultifield']", e.target).genericMultiField();
		});
	}
}(window.jQuery));