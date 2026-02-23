from django.urls import path
from .views import ProfitabilityReportView
from .views_cashflow import CashFlowSummaryView
from .views_search import GlobalSearchView
from .views_alerts import AlertsView
from .views_charts import SalesTrendView, TopProductsView
from .views_activity import ActivityTimelineView
from .views_aging import AgingReportView

urlpatterns = [
    path('profitability/', ProfitabilityReportView.as_view()),
    path('cashflow/', CashFlowSummaryView.as_view()),
    path('search/', GlobalSearchView.as_view()),
    path('alerts/', AlertsView.as_view()),
    path('sales-trend/', SalesTrendView.as_view()),
    path('top-products/', TopProductsView.as_view()),
    path('activity/', ActivityTimelineView.as_view()),
    path('aging/', AgingReportView.as_view()),
]
