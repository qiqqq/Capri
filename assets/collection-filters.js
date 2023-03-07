jQuery.extend(window.Capri, {
  filters: {
    selected: [],
    $filters: [],

    init: function () {
      Shopify.queryParams = {};

      Capri.filters.initFiltersObject();
      Capri.filters.initEvents();

      window.onpopstate = history.onpushstate = function () {
        Capri.filters.getContentByAjax();
      };

      jQuery(window).on("accordion-toggle", function (e, accordion) {
        var index = accordion.index();
        Capri.filters.$filters[index].closed =
          !Capri.filters.$filters[index].closed;
      });

      jQuery(document).on("shopify:section:load", function (event) {
        Capri.filters.initProductsPerPage();
        Capri.filters.initSorting();
      });
    },

    initEvents: function () {
      Capri.filters.initSidebarFilters();
      Capri.filters.initPagination();
      Capri.filters.initProductsPerPage();
      Capri.filters.initSorting();
      Capri.filters.initLayoutType();
    },

    initFiltersObject: function () {
      var filter = jQuery("#sidebar").find(".widget.filter");

      filter.each(function () {
        Capri.filters.$filters.push(
          JSON.parse('{"selected": null, "closed": false}')
        );
      });
    },

    initSidebarFilters: function () {
      var filter = jQuery("#sidebar").find(".widget.filter");

      filter.each(function () {
        var self = jQuery(this),
          triggers = self.find("a[data-filter]"),
          clear = self.find("a[data-clear]");

        if (Capri.filters.getUrlParameter("constraint")) {
          var currentFilters = Capri.filters
            .getUrlParameter("constraint")
            .split("+");

          for (var i = 0, len = currentFilters.length; i < len; i++) {
            var searchedFilter = jQuery(
                '[data-filter="' + currentFilters[i] + '"]'
              ),
              searchedWidget = searchedFilter.closest(".widget.filter");

            if (searchedFilter.length > 0) {
              Capri.filters.$filters[searchedWidget.index()].selected =
                currentFilters[i];
              searchedWidget.find(".clear").show();
              searchedFilter.addClass("active");
            }
          }
        }

        if (Capri.filters.$filters[self.index()].closed) {
          self.addClass("rolled-up");
        }

        triggers.click(function (e) {
          e.preventDefault();

          var link = jQuery(this),
            filter = link.data("filter");

          self.find("a.active").removeClass("active");
          self.find(".clear").show();
          link.addClass("active");

          Capri.filters.$filters[self.index()].selected = filter;

          delete Shopify.queryParams.page;
          delete Shopify.queryParams.constraint;
          if (Capri.filters.joinFilters()) {
            Shopify.queryParams.constraint = Capri.filters.joinFilters();
          }

          window.history.pushState(
            {
              param: Shopify.queryParams,
            },
            "",
            Capri.filters.createNewUrl()
          );
        });

        clear.click(function (e) {
          e.preventDefault();

          self.find("a.active").removeClass("active");
          self.find(".clear").hide();

          Capri.filters.$filters[self.index()].selected = null;
          delete Shopify.queryParams.page;
          delete Shopify.queryParams.constraint;
          if (Capri.filters.joinFilters()) {
            Shopify.queryParams.constraint = Capri.filters.joinFilters();
          }

          window.history.pushState(
            {
              param: Shopify.queryParams,
            },
            "",
            Capri.filters.createNewUrl()
          );
        });

        // Accordions
      });
    },

    initPagination: function () {
      var pagination = jQuery("#pagination"),
        triggers = pagination.find("a");

      triggers.click(function (e) {
        e.preventDefault();

        var page = Capri.filters.getUrlParameter(
          "page",
          jQuery(this).attr("href")
        );

        delete Shopify.queryParams.page;
        if (page > 1) {
          Shopify.queryParams.page = page;
        }

        window.history.pushState(
          {
            param: Shopify.queryParams,
          },
          "",
          Capri.filters.createNewUrl()
        );
      });
    },

    initProductsPerPage: function () {
      var select = jQuery("#products-to-show"),
        defaultVal = select.data("default"),
        show = Capri.filters.getUrlParameter("view")
          ? Capri.filters.getUrlParameter("view")
          : defaultVal;

      select.selectric({
        arrowButtonMarkup: '<i class="icon-arrow-down"></i>',
        onBeforeInit: function () {
          if (show) {
            select.find('option[value="' + show + '"]').attr("selected", true);
          }
        },
        onChange: function () {
          var currentVal = jQuery(this).val();

          delete Shopify.queryParams.page;
          delete Shopify.queryParams.view;
          if (currentVal != defaultVal) {
            Shopify.queryParams.view = currentVal;
          }

          window.history.pushState(
            {
              param: Shopify.queryParams,
            },
            "",
            Capri.filters.createNewUrl()
          );
        },
      });
    },

    initSorting: function () {
      var select = jQuery("#sort-by"),
        defaultVal = select.data("default"),
        sort = Capri.filters.getUrlParameter("sort_by")
          ? Capri.filters.getUrlParameter("sort_by")
          : defaultVal;

      select.selectric({
        arrowButtonMarkup: '<i class="icon-arrow-down"></i>',
        onBeforeInit: function () {
          if (sort) {
            select.find('option[value="' + sort + '"]').attr("selected", true);
          }
        },
        onChange: function () {
          var currentVal = jQuery(this).val();

          delete Shopify.queryParams.sort_by;
          if (currentVal != defaultVal) {
            Shopify.queryParams.sort_by = currentVal;
          }

          window.history.pushState(
            {
              param: Shopify.queryParams,
            },
            "",
            Capri.filters.createNewUrl()
          );
        },
      });
    },

    initLayoutType: function () {
      var switcher = jQuery("#layout-switcher"),
        triggers = switcher.find("a"),
        productsContainer = jQuery("#products-container");

      if (Capri.filters.getUrlParameter("layout") == "list") {
        triggers.removeClass("active");
        triggers.filter('[data-layout="list"]').addClass("active");
        productsContainer.removeClass().addClass("products-list");
      }

      triggers.click(function (e) {
        e.preventDefault();

        var layout = jQuery(this).data("layout");

        delete Shopify.queryParams.layout;
        if (layout == "list") {
          Shopify.queryParams.layout = layout;
        }

        window.history.pushState(
          {
            param: Shopify.queryParams,
          },
          "",
          Capri.filters.createNewUrl()
        );
      });
    },

    getContentByAjax: function () {
      jQuery.ajax({
        type: "get",
        url: Capri.filters.getUrl(),
        beforeSend: function () {
          Capri.showOverlay();
        },
        success: function (data) {
          Capri.hideOverlay();

          Capri.filters.replaceData(data);

          Capri.filters.initEvents();
          Capri.filters.reinitProductReviews();
          Capri.call("accordion", ".accordion");
        },
        error: function () {
          Capri.hideOverlay();
        },
      });
    },

    replaceData: function (data) {
      var content = jQuery("#content"),
        sidebar = jQuery("#sidebar");

      var newContent = jQuery(data).find("#content"),
        newSidebar = jQuery(data).find("#sidebar");

      content.empty().append(newContent.html());
      sidebar.empty().append(newSidebar.html());
    },

    reinitProductReviews: function () {
      if (jQuery(".shopify-product-reviews-badge").length > 0) {
        SPR.registerCallbacks();
        SPR.initRatingHandler();
        SPR.initDomEls();
        SPR.loadProducts();
        SPR.loadBadges();
      }
    },

    getUrl: function () {
      return location.pathname + location.search;
    },

    createNewUrl: function () {
      if (jQuery.param(Shopify.queryParams) != "") {
        return (
          "/collections/" +
          Capri.filters.getCollectionHandle() +
          "?" +
          jQuery.param(Shopify.queryParams).replace(/%2B/g, "+")
        );
      }

      return "/collections/" + Capri.filters.getCollectionHandle();
    },

    joinFilters() {
      var resultArray = [];

      for (var i = 0, len = Capri.filters.$filters.length; i < len; i++) {
        if (Capri.filters.$filters[i].selected) {
          resultArray.push(Capri.filters.$filters[i].selected);
        }
      }

      return resultArray.join("+");
    },

    getCollectionHandle: function () {
      var url = location.pathname,
        base = "/collections/";

      var index = url.indexOf(base);

      if (index < 0) {
        return false;
      }

      url = url.slice(index + base.length, url.length);

      var tmp = url.indexOf("/") > -1 ? url.indexOf("/") : url.length;

      return url.slice(0, tmp).toLowerCase();
    },

    getUrlParameter: function (parameter, url = location.search) {
      var result = null,
        tmp = [];

      if (url != "") {
        tmp = url.split("?");

        var items = tmp[1].split("&");

        for (var i = 0, l = items.length; i < l; i++) {
          tmp = items[i].split("=");
          if (tmp[0] === parameter) result = decodeURIComponent(tmp[1]);
        }
      }

      return result;
    },
  },
});

jQuery(document).ready(function () {
  Capri.filters.init();
});

(function (history) {
  var pushState = history.pushState;
  history.pushState = function (state) {
    if (typeof history.onpushstate == "function") {
      history.onpushstate({ state: state });
    }
    return pushState.apply(history, arguments);
  };
})(window.history);
