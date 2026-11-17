from django.contrib import admin

from .models import BenchmarkRun, BenchmarkSoftware, Component, SystemBuild, TuningProfile


@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'brand', 'name', 'created_by')
    list_filter = ('type',)
    search_fields = ('brand', 'name')


@admin.register(SystemBuild)
class SystemBuildAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'form_factor', 'owner', 'created_at')
    list_filter = ('form_factor',)


@admin.register(TuningProfile)
class TuningProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'build', 'fan_profile')


@admin.register(BenchmarkSoftware)
class BenchmarkSoftwareAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'score_unit', 'created_by')
    list_filter = ('category',)
    search_fields = ('name',)


@admin.register(BenchmarkRun)
class BenchmarkRunAdmin(admin.ModelAdmin):
    list_display = ('id', 'build', 'software', 'score', 'throttled', 'created_at')
    list_filter = ('throttled', 'software')
