var Capri = {};

jQuery.extend(window.Capri, {
  init: function () {
    jQuery("body").addClass("loaded");

    if (Capri.cookiesEnabled()) {
      document.documentElement.className =
        document.documentElement.className.replace(
          "supports-no-cookies",
          "supports-cookies"
        );
    }

    Capri.call("currency", '[data-multiple-currencies="enabled"]');
    Capri.call("product", "#product");
    Capri.call("searchFormModal", '[data-remodal-id="search"]');
    Capri.call("toggleFiltersMobile", ".toggle-filters-mobile");
    Capri.call("addressForm", "#new-address-form");
    Capri.call("passwordForm", "#password");
    Capri.call("testimonialsCarousel", ".testimonials-carousel");
    Capri.call("formValidation", "form.validate, .validate-forms-inside form");
    Capri.call("loginForm", "#login");
    Capri.call("productsCarousel", ".products-carousel");
    Capri.call("blogTilesCarousel", ".blog-tiles-carousel");
    Capri.call("slideshow", "div#slideshow");
    Capri.call("accordion", ".accordion");
    Capri.call("tabs", "#tabs");
    Capri.call("productSlider", "#product .images");
    Capri.call("sideNav", 'a[href="#side-nav"]');
    Capri.call("scrollToTop", "#scroll-to-top");
    Capri.call("select", "select:not(.raw)");
    Capri.call("inputCheckbox", 'input[type="checkbox"]');
    Capri.call("inputRadio", 'input[type="radio"]');
    Capri.call("inputNumber", 'input[type="number"]');

    jQuery(document).on("shopify:section:load", function (event) {
      if (event.target.id == "shopify-section-slideshow") {
        Capri.call("slideshow", "div#slideshow");
      }

      Capri.call("searchFormModal", '[data-remodal-id="search-popup"]');
      Capri.call("productsCarousel", ".products-carousel");
      Capri.call("blogTilesCarousel", ".blog-tiles-carousel");
      Capri.call("testimonialsCarousel", ".testimonials-carousel");
      Capri.call("sideNav", 'a[href="#side-nav"]');
      Capri.call("accordion", ".accordion");
      Capri.call("tabs", "#tabs");
      Capri.call("productSlider", "#product .images");
      Capri.call("scrollToTop", "#scroll-to-top");
      Capri.call("select", "select:not(.raw)");
      Capri.call("inputNumber", 'input[type="number"]');

      jQuery(".parallax").parallax("refresh");
    });
  },

  currency: {
    init: function () {
      var data = jQuery('[data-multiple-currencies="enabled"]'),
        shopCurrency = theme.currency,
        cookieCurrency = Currency.cookie.read(),
        select = jQuery("[name=currencies]"),
        selectedCurrency = jQuery(".selected-currency"),
        currencyInfo = jQuery(".currency-info");

      Currency.format = data.data("currency-format");
      Currency.moneyFormats[shopCurrency].money_with_currency_format =
        data.data("money-with-currency-format");
      Currency.moneyFormats[shopCurrency].money_format =
        data.data("money-format");

      jQuery("span.money").each(function () {
        jQuery(this).attr("data-currency-" + shopCurrency, jQuery(this).html());
      });

      if (cookieCurrency == null) {
        Currency.currentCurrency = shopCurrency;
      } else if (
        select.length > 0 &&
        jQuery("[name=currencies] option[value=" + cookieCurrency + "]")
          .length === 0
      ) {
        Currency.currentCurrency = shopCurrency;
        Currency.cookie.write(shopCurrency);
      } else if (cookieCurrency === shopCurrency) {
        Currency.currentCurrency = shopCurrency;
      } else {
        Currency.convertAll(shopCurrency, cookieCurrency);
      }

      selectedCurrency.text(Currency.currentCurrency);
      if (Currency.currentCurrency == shopCurrency) {
        currencyInfo.hide();
      }

      select.val(Currency.currentCurrency).change(function () {
        var newCurrency = jQuery(this).val(),
          secondSelect = select.not(this);

        Currency.convertAll(Currency.currentCurrency, newCurrency);

        secondSelect.val(newCurrency);

        if (!secondSelect.hasClass("raw")) {
          secondSelect.selectric("refresh");
        }

        selectedCurrency.text(Currency.currentCurrency);
        if (Currency.currentCurrency == shopCurrency) {
          currencyInfo.hide();
        } else {
          currencyInfo.show();
        }
      });

      jQuery(window).on("update-product-price", function () {
        Currency.convertAll(shopCurrency, Currency.currentCurrency);
      });
    },
  },

  product: {
    init: function () {
      Capri.product.options = JSON.parse(jQuery("[data-product-json]").html());
      Capri.product.selects = jQuery("[data-single-option-selector]");
      Capri.product.mainSelect = jQuery("[data-product-select]");
      Capri.product.currentOptions = null;
      Capri.product.selectedVariant = null;
      Capri.product.priceContainer = jQuery("#product .price .standard");
      Capri.product.oldPriceContainer = jQuery("#product .price .old");
      Capri.product.addToCartButton = jQuery("#add-to-cart-btn");

      // Call actions after select change
      Capri.product.selects.on("change", function () {
        // Get selected variant
        Capri.product.getSelectedOptions();
        Capri.product.getVariantFromOptions();

        if (!Capri.product.selectedVariant) {
          return;
        }

        // Update product price
        Capri.product.updateProductPrice();

        // Update hidden select
        Capri.product.mainSelect.val(Capri.product.selectedVariant.id);

        // Change variant image
        Capri.product.changeProductImage();

        // Block/Unblock button if product is sold out
        Capri.product.blockUnblockBtn();
      });
    },

    getSelectedOptions: function () {
      var currentOptions = jQuery.map(
        Capri.product.selects,
        function (element) {
          var $element = jQuery(element),
            currentOption = {};

          currentOption.value = $element.val();
          currentOption.index = $element.data("index");

          return currentOption;
        }
      );

      Capri.product.currentOptions = currentOptions;
    },

    getVariantFromOptions: function () {
      var selectedValues = Capri.product.currentOptions;
      var variants = Capri.product.options.variants;
      var found = false;

      variants.forEach(function (variant) {
        var satisfied = true;

        selectedValues.forEach(function (option) {
          if (satisfied) {
            satisfied = option.value === variant[option.index];
          }
        });

        if (satisfied) {
          found = variant;
        }
      });

      Capri.product.selectedVariant = found || null;
    },

    updateProductPrice: function () {
      var variant = Capri.product.selectedVariant;

      if (!variant) {
        return;
      }

      if (
        !variant.compare_at_price ||
        variant.compare_at_price <= variant.price
      ) {
        Capri.product.priceContainer.html(
          '<span class="money" data-currency-' +
            theme.currency +
            '="' +
            Capri.formatMoney(variant.price, theme.moneyFormat) +
            '">' +
            Capri.formatMoney(variant.price, theme.moneyFormat) +
            "</span>"
        );
        Capri.product.oldPriceContainer.html("");
      } else {
        Capri.product.priceContainer.html(
          '<span class="money" data-currency-' +
            theme.currency +
            '="' +
            Capri.formatMoney(variant.price, theme.moneyFormat) +
            '">' +
            Capri.formatMoney(variant.price, theme.moneyFormat) +
            "</span>"
        );
        Capri.product.oldPriceContainer.html(
          '<span class="money" data-currency-' +
            theme.currency +
            '="' +
            Capri.formatMoney(variant.compare_at_price, theme.moneyFormat) +
            '">' +
            Capri.formatMoney(variant.compare_at_price, theme.moneyFormat) +
            "</span>"
        );
      }

      jQuery(window).trigger("update-product-price");
    },

    changeProductImage: function () {
      if (!Capri.product.selectedVariant.featured_image) {
        return;
      }

      var imageID = Capri.product.selectedVariant.featured_image.src.split("="),
        image = jQuery(".main-image").find('img[src*="' + imageID[1] + '"]');

      if (image.length > 0) {
        jQuery(".carousel").slick(
          "slickGoTo",
          image.closest(".slick-slide").index()
        );
      }
    },

    blockUnblockBtn: function () {
      if (!Capri.product.selectedVariant.available) {
        Capri.product.addToCartButton.attr("disabled", true);
        Capri.product.addToCartButton.text(
          Capri.product.addToCartButton.data("unavailable")
        );
      } else {
        Capri.product.addToCartButton.attr("disabled", false);
        Capri.product.addToCartButton.text(
          Capri.product.addToCartButton.data("available")
        );
      }
    },
  },

  cookiesEnabled: function () {
    var cookieEnabled = navigator.cookieEnabled;

    if (!cookieEnabled) {
      document.cookie = "testcookie";
      cookieEnabled = document.cookie.indexOf("testcookie") !== -1;
    }

    return cookieEnabled;
  },

  formatMoney: function (cents, format) {
    if (typeof cents === "string") {
      cents = cents.replace(".", "");
    }
    var value = "";
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || moneyFormat;

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = precision == null ? 2 : precision;
      thousands = thousands == null ? "," : thousands;
      decimal = decimal == null ? "." : decimal;

      if (isNaN(number) || number == null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      var parts = number.split(".");
      var dollarsAmount = parts[0].replace(
        /(\d)(?=(\d\d\d)+(?!\d))/g,
        "$1" + thousands
      );
      var centsAmount = parts[1] ? decimal + parts[1] : "";

      return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case "amount":
        value = formatWithDelimiters(cents, 2);
        break;
      case "amount_no_decimals":
        value = formatWithDelimiters(cents, 0);
        break;
      case "amount_with_space_separator":
        value = formatWithDelimiters(cents, 2, " ", ".");
        break;
      case "amount_with_comma_separator":
        value = formatWithDelimiters(cents, 2, ",", ".");
        break;
      case "amount_no_decimals_with_comma_separator":
        value = formatWithDelimiters(cents, 0, ",", ".");
        break;
      case "amount_no_decimals_with_space_separator":
        value = formatWithDelimiters(cents, 0, " ");
        break;
    }

    return formatString.replace(placeholderRegex, value);
  },

  searchFormModal: function (element) {
    jQuery(element).remodal();

    jQuery(document).on("opened", ".remodal", function () {
      jQuery(element).find("input").focus();
    });
  },

  toggleFiltersMobile: function (element) {
    var toggle = jQuery(element);

    toggle.click(function (e) {
      e.preventDefault();
      toggle.toggleClass("open");
    });
  },

  addressForm: function (element) {
    var body = jQuery("html, body"),
      headerHeight = 80;
    (newAddressForm = jQuery(element)),
      (trigger = jQuery("#new-address-trigger")),
      (cancel = newAddressForm.find("#cancel-address")),
      (edit = jQuery(".edit-address-trigger")),
      (cancelEdit = jQuery(".cancel-edit")),
      (deleteAddress = jQuery(".delete-address-trigger")),
      (countrySelects = jQuery("select.country-select"));

    trigger.click(function (e) {
      e.preventDefault();

      newAddressForm.show().find('input[type="text"]').first().focus();
      trigger.hide();

      body.animate(
        { scrollTop: newAddressForm.offset().top - headerHeight },
        1
      );
    });

    cancel.click(function (e) {
      e.preventDefault();

      newAddressForm.hide();
      trigger.show();

      body.animate({ scrollTop: trigger.offset().top - headerHeight }, 1);
    });

    edit.click(function (e) {
      e.preventDefault();

      var self = jQuery(this),
        form = self.closest("td").find(".edit-form-container");

      form.show();
      self.closest("td").find(".address-container").hide();

      body.animate({ scrollTop: form.offset().top - headerHeight }, 1);
    });

    cancelEdit.click(function (e) {
      e.preventDefault();

      var self = jQuery(this),
        address = self.closest("td").find(".address-container");

      self.closest("td").find(".edit-form-container").hide();
      address.show();

      body.animate({ scrollTop: address.offset().top - headerHeight }, 1);
    });

    deleteAddress.click(function (e) {
      e.preventDefault();

      var self = jQuery(this),
        result = confirm(self.data("confirm-text")),
        formId = self.data("form-id");

      if (result) {
        Shopify.postLink("/account/addresses/" + formId, {
          parameters: { _method: "delete" },
        });
      }
    });

    countrySelects.selectric({
      arrowButtonMarkup: '<i class="icon-arrow-down"></i>',
      onChange: function () {
        Capri.setProvincesSelect(jQuery(this));
      },
    });
  },

  setProvincesSelect: function (element) {
    var _self = element,
      option = _self.find('option[value="' + _self.val() + '"]'),
      provinces = option.data("provinces"),
      relatedProvinceSelect = _self
        .closest(".grid")
        .find("select.province-select"),
      relatedProvinceContainer = relatedProvinceSelect.closest(
        ".province-hidden-container"
      );

    if (provinces.length > 0) {
      for (var i = 0, len = provinces.length; i < len; i++) {
        relatedProvinceSelect.append(
          '<option value="' +
            provinces[i][0] +
            '">' +
            provinces[i][1] +
            "</option>"
        );
      }

      relatedProvinceContainer.show();
      relatedProvinceSelect.selectric("refresh");
    } else {
      relatedProvinceSelect.html("");
      relatedProvinceContainer.hide();
      relatedProvinceSelect.selectric("refresh");
    }
  },

  passwordForm: function (element) {
    var passwordPage = jQuery(element),
      notifyForm = passwordPage.find("#notify-me-form"),
      changeToEnterPassword = passwordPage.find(
        "#enter-using-password-trigger"
      ),
      passwordForm = passwordPage.find("#enter-using-password-form"),
      changeToNotifyMe = passwordPage.find("#enter-notify-me-trigger");

    changeToEnterPassword.click(function (e) {
      e.preventDefault();
      notifyForm.hide();
      changeToEnterPassword.hide();
      passwordForm.show();
      changeToNotifyMe.show();
    });

    changeToNotifyMe.click(function (e) {
      e.preventDefault();
      passwordForm.hide();
      changeToNotifyMe.hide();
      notifyForm.show();
      changeToEnterPassword.show();
    });
  },

  testimonialsCarousel: function (element) {
    jQuery(element).each(function () {
      var _self = jQuery(this);

      if (
        _self.hasClass("slick-initialized") ||
        _self.find(".testimonial").length < 1
      ) {
        return;
      }

      _self.slick({
        arrows: false,
        dots: true,
        fase: true,
        adaptiveHeight: true,
        slidesToShow: 1,
        slidesToScroll: 1,
      });
    });
  },

  formValidation: function (element) {
    var form = jQuery(element);

    form.each(function () {
      jQuery(this).validate({
        errorElement: "span",
        rules: {
          "customer[password_confirmation]": {
            equalTo: '[name="customer[password]"]',
          },
        },
      });
    });
  },

  loginForm: function (element) {
    var loginForm = jQuery(element),
      changeToReset = loginForm.find("#reset-password-trigger"),
      resetForm = jQuery("#reset-password"),
      changeToLogin = resetForm.find("#login-trigger");

    changeToReset.click(function (e) {
      e.preventDefault();
      loginForm.addClass("hide");
      resetForm.removeClass("hide");
    });

    changeToLogin.click(function (e) {
      e.preventDefault();
      resetForm.addClass("hide");
      loginForm.removeClass("hide");
    });

    // Show reset form success message
    var resetSuccess = jQuery(".reset-password-success").length,
      message = jQuery("#reset-password-success");

    if (resetSuccess) {
      message.removeClass("hide");
    }

    // Show reset form if hash is #recover
    if (window.location.hash == "#recover") {
      loginForm.addClass("hide");
      resetForm.removeClass("hide");
    }
  },

  blogTilesCarousel: function (element) {
    jQuery(element).each(function () {
      var _self = jQuery(this).find(".blog-tiles-grid");

      if (
        _self.hasClass("slick-initialized") ||
        _self.find(".blog-tile").length < 4
      ) {
        return;
      }

      _self.slick({
        arrows: false,
        dots: true,
        slidesToShow: 4,
        slidesToScroll: 4,
        responsive: [
          {
            breakpoint: 1160,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
            },
          },
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 2,
            },
          },
          {
            breakpoint: 576,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1,
            },
          },
        ],
      });
    });
  },

  productsCarousel: function (element) {
    jQuery(element).each(function () {
      var _self = jQuery(this).find(".products-grid");

      if (
        _self.hasClass("slick-initialized") ||
        _self.find(".product-item").length < 4
      ) {
        return;
      }

      _self.slick({
        arrows: false,
        dots: true,
        slidesToShow: 4,
        slidesToScroll: 4,
        responsive: [
          {
            breakpoint: 1160,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
            },
          },
          {
            breakpoint: 992,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 2,
            },
          },
          {
            breakpoint: 576,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1,
            },
          },
        ],
      });
    });
  },

  slideshow: function (element) {
    var slideshow = jQuery("div#slideshow"),
      fade = slideshow.data("animation-type") == "fade" ? true : false,
      autoplay = slideshow.data("autoplay"),
      autoplaySpeed = slideshow.data("autoplay-speed"),
      arrows = slideshow.data("show-arrows"),
      dots = slideshow.data("show-dots");

    slideshow.slick({
      fade: fade,
      autoplay: autoplay,
      autoplaySpeed: autoplaySpeed,
      arrows: arrows,
      dots: dots,
      cssEase: "ease-in-out",
      speed: 600,
      adaptiveHeight: true,
      prevArrow:
        '<span class="slick-prev"><i class="icon-arrow-left"></i></span>',
      nextArrow:
        '<span class="slick-next"><i class="icon-arrow-right"></i></span>',
    });
  },

  accordion: function (element) {
    var accordion = jQuery(element),
      triggers = accordion.find(".accordion-trigger");

    triggers.click(function (e) {
      e.preventDefault();
      var self = jQuery(this).closest(".accordion");

      self.toggleClass("rolled-up");
      jQuery(window).trigger("accordion-toggle", [self]);
    });
  },

  tabs: function (element) {
    var tabs = jQuery(element),
      links = tabs.find(".menu a"),
      content = tabs.find(".tab-content");

    links.click(function (e) {
      e.preventDefault();

      var self = jQuery(this);
      href = self.attr("href");

      links.removeClass("active");
      self.addClass("active");

      content.not(href).removeClass("active");
      content.filter(href).addClass("active");
    });
  },

  productSlider: function (element) {
    var images = jQuery(element),
      main = images.find(".main-image"),
      carousel = images.find(".carousel");

    main.slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      asNavFor: ".carousel",
    });

    carousel.slick({
      prevArrow: '<a href="#" class="slick-prev icon-arrow-left"></a>',
      nextArrow: '<a href="#" class="slick-next icon-arrow-right"></a>',
      slidesToShow: 3,
      slidesToScroll: 1,
      asNavFor: ".main-image",
      centerMode: true,
      focusOnSelect: true,
    });
  },

  sideNav: function (element) {
    var sideNav = jQuery("#side-nav"),
      inner = sideNav.find("> .inner"),
      activeLevel = 0;

    // open or close side nav
    jQuery(element).click(function (e) {
      e.preventDefault();
      jQuery("body").toggleClass("side-nav-visible");
    });

    // close side nav when click on #page
    jQuery(document).on("click", "body.side-nav-visible #page", function () {
      jQuery("body").removeClass("side-nav-visible");
    });

    // go throught levels
    sideNav.find("ul > li").each(function () {
      var self = jQuery(this),
        linkText = self.find("> a").clone().children().remove().end().text(),
        nextLevel = self.find("> ul");

      if (nextLevel.length > 0) {
        nextLevel.before(
          '<a href="#" class="icon-arrow-right go-forward"></a>'
        );
        nextLevel.prepend(
          '<li><a href="#" class="go-back"><i class="icon-arrow-left"></i><span>Back</span></a></li>'
        );
      }
    });

    sideNav.find(".go-forward").click(function (e) {
      e.preventDefault();
      var self = jQuery(this),
        ul = self.siblings("ul");

      activeLevel += 1;

      ul.show();

      inner.addClass("level-" + activeLevel).css({
        "min-height": ul.height(),
      });
    });

    sideNav.find(".go-back").click(function (e) {
      e.preventDefault();
      var self = jQuery(this),
        ul = self.closest("ul");

      inner.removeClass("level-" + activeLevel).css({
        "min-height": ul.parent().parent().height(),
      });

      activeLevel -= 1;

      setTimeout(function () {
        ul.hide();
      }, 300);
    });
  },

  scrollToTop: function (element) {
    var button = jQuery(element);

    jQuery(window).scrollTop() > 200
      ? button.addClass("visible")
      : button.removeClass("visible");

    jQuery(window).scroll(function () {
      jQuery(this).scrollTop() > 200
        ? button.addClass("visible")
        : button.removeClass("visible");
    });

    button.click(function (e) {
      e.preventDefault();
      jQuery("html, body").animate({ scrollTop: 0 });
    });
  },

  showOverlay: function () {
    jQuery("#overlay").show();
  },

  hideOverlay: function () {
    jQuery("#overlay").hide();
  },

  select: function (element) {
    jQuery(element).selectric({
      arrowButtonMarkup: '<i class="icon-arrow-down"></i>',
      labelBuilder: function (item) {
        var labelPrefix = jQuery(item.element)
          .closest("select")
          .data("label-prefix");

        if (labelPrefix) {
          return labelPrefix + " &mdash; " + item.text;
        }

        return item.text;
      },
      onChange: function () {
        jQuery(this).trigger("change");
      },
    });
  },

  inputCheckbox: function (element) {
    jQuery(element)
      .wrap('<div class="js-input-checkbox"></div>')
      .parent()
      .append('<span class="checker icon-check"></span>');
  },

  inputRadio: function (element) {
    jQuery(element)
      .wrap('<div class="js-input-radio"></div>')
      .parent()
      .append('<span class="checker"></span>');
  },

  inputNumber: function (element) {
    jQuery(element)
      .wrap('<div class="js-input-number"></div>')
      .parent()
      .append(
        '<span class="js-spinner-up icon-plus"></span><span class="js-spinner-down icon-minus"></span>'
      );

    jQuery(".js-input-number").each(function () {
      var self = jQuery(this),
        input = self.find("input"),
        min = input.attr("min") ? input.attr("min") : 1,
        max = input.attr("max") ? input.attr("max") : 999,
        plus = self.find(".js-spinner-up"),
        minus = self.find(".js-spinner-down"),
        value = input.val();

      if (value.length === 0) {
        input.val(min);
      }

      plus.click(function () {
        value = input.val();
        if (value < max) {
          input.val(parseInt(value) + 1);
        }
      });

      minus.click(function () {
        value = input.val();
        if (value > min) {
          input.val(parseInt(value) - 1);
        }
      });

      input.blur(function () {
        if (isNaN(input.val()) || input.val().length === 0) {
          input.val(min);
        }
      });
    });
  },

  call: function (fnName, selector, argArray) {
    if (typeof selector === "undefined" || jQuery(selector).length === 0) {
      return;
    }

    if (typeof argArray === "undefined") {
      argArray = [];
    }

    argArray.unshift(selector);

    if (typeof Capri[fnName] === "function") {
      Capri[fnName].apply(this, argArray);
    } else if (typeof Capri[fnName] === "object") {
      Capri[fnName].init();
    }
  },
});

jQuery(document).ready(function () {
  Capri.init();
});
