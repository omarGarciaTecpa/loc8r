(function ($) {
    $(document).ready(function () {
        $('#addReview').submit(function (e) {
            var alertMsg =  $('.alert.alert-danger');
            alertMsg.hide();
            if (!$('input#name').val() || !$('select#rating').val() ||
                !$('textarea#review').val()) {if (alertMsg.length) {
                alertMsg.show();
            } else {
                $(this).prepend('<div role="alert" class="alert alert-danger">All fields required, please try again</div>');
            }
                return false;
            }
        });
    });
})(jQuery);
