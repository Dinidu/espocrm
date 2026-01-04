define('custom:views/report/record/new-vs-existing-client-lead', ['views/report/record/grid'], function (Dep) {

    return Dep.extend({

        template: 'custom:report/record/new-vs-existing-client-lead',

        setup: function () {
            Dep.prototype.setup.call(this);
        },

        getReportData: function () {
            return Dep.prototype.getReportData.call(this).then((data) => {
                // Format conversion rate as percentage
                if (data.data) {
                    data.data.forEach((row) => {
                        if (row.conversionRate !== undefined) {
                            row.conversionRateFormatted = row.conversionRate + '%';
                        }
                    });
                }
                return data;
            });
        },

        prepareColumns: function (columns) {
            // Customize column display
            columns.forEach((column) => {
                if (column.name === 'conversionRate') {
                    column.type = 'float';
                    column.format = 'percentage';
                    column.decimals = 2;
                }
            });
            
            return Dep.prototype.prepareColumns.call(this, columns);
        },

    });
});

