#' {{model_name}} - 流域水系统模拟模型
#'
#' 基于 Watershed SDK 的 R 模型模板
#'

library(jsonlite)
library(ncdf4)

#' 模型配置
model_config <- list(
  name = "{{model_name}}",
  version = "{{version}}",
  description = "{{model_description}}",
  author = "{{author}}",
  parameters = list(
    {% for param in parameters %}
    list(
      name = "{{param.name}}",
      type = "{{param.type}}",
      default = {{param.default}},
      min_value = {{param.min_value or 'NULL'}},
      max_value = {{param.max_value or 'NULL'}},
      description = "{{param.description}}",
      unit = "{{param.unit}}"
    ){% if not loop.last %},{% endif %}
    {% endfor %}
  ),
  inputs = list(
    {% for input in inputs %}
    list(
      name = "{{input.name}}",
      type = "{{input.type}}",
      data_type = "{{input.data_type}}",
      description = "{{input.description}}",
      unit = "{{input.unit}}",
      required = {{input.required | lower}}
    ){% if not loop.last %},{% endif %}
    {% endfor %}
  ),
  outputs = list(
    {% for output in outputs %}
    list(
      name = "{{output.name}}",
      type = "{{output.type}}",
      data_type = "{{output.data_type}}",
      description = "{{output.description}}",
      unit = "{{output.unit}}"
    ){% if not loop.last %},{% endif %}
    {% endfor %}
  )
)

#' 模型类
{{class_name}} <- R6::R6Class("{{class_name}}",
  public = list(
    parameters = list(),
    inputs = list(),
    outputs = list(),
    metadata = list(),

    initialize = function() {
      # 初始化默认值
      for (param in model_config$parameters) {
        self$parameters[[param$name]] <- param$default
      }
      self$metadata <- list(
        status = "initialized",
        start_time = NULL,
        end_time = NULL
      )
    },

    set_parameters = function(...) {
      params <- list(...)
      for (name in names(params)) {
        self$parameters[[name]] <- params[[name]]
      }
      invisible(self)
    },

    set_inputs = function(...) {
      inputs <- list(...)
      for (name in names(inputs)) {
        self$inputs[[name]] <- inputs[[name]]
      }
      invisible(self)
    },

    run = function() {
      self$pre_run()

      tryCatch({
        # 获取参数和输入
        {% for param in parameters %}
        {{param.name}} <- self$parameters${{param.name}}
        {% endfor %}

        {% for input in inputs %}
        {{input.name}} <- self$inputs${{input.name}}
        {% endfor %}

        # TODO: 实现模型计算逻辑
        # ========================================

        {% for output in outputs %}
        # 计算 {{output.name}}
        self$outputs${{output.name}} <- self$calculate_{{output.name}}(
          {% for input in inputs %}{{input.name}}, {% endfor %}
          {% for param in parameters %}{{param.name}}{% if not loop.last %}, {% endif %}{% endfor %}
        )
        {% endfor %}

        self$post_run(success = TRUE)

      }, error = function(e) {
        self$post_run(success = FALSE, error = conditionMessage(e))
        stop(e)
      })

      invisible(self)
    },

    {% for output in outputs %}
    calculate_{{output.name}} = function({% for input in inputs %}{{input.name}}, {% endfor %}{% for param in parameters %}{{param.name}}{% if not loop.last %}, {% endif %}{% endfor %}) {
      # TODO: 实现 {{output.description}} 的计算
      result <- rep(0, length({{inputs[0].name if inputs else '1'}}))
      return(result)
    },
    {% endfor %}

    pre_run = function() {
      self$metadata$start_time <- Sys.time()
      self$metadata$status <- "running"
    },

    post_run = function(success, error = "") {
      self$metadata$end_time <- Sys.time()
      self$metadata$status <- if (success) "completed" else "failed"
      if (error != "") {
        self$metadata$error <- error
      }
    },

    get_outputs = function() {
      return(self$outputs)
    },

    save_outputs = function(output_dir) {
      dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)

      # 保存输出到 NetCDF
      for (name in names(self$outputs)) {
        filename <- file.path(output_dir, paste0(name, ".nc"))

        # 创建 NetCDF 文件
        dim <- ncdim_def(name, units = "", vals = 1:length(self$outputs[[name]]))
        var <- ncvar_def(name, units = "", dim = dim)
        nc <- nc_create(filename, var)
        ncvar_put(nc, var, self$outputs[[name]])
        nc_close(nc)
      }

      # 保存元数据
      meta_file <- file.path(output_dir, "metadata.json")
      write_json(self$metadata, meta_file, pretty = TRUE)

      message("输出已保存到: ", output_dir)
    }
  )
)

#' 主函数 - 用于命令行执行
main <- function() {
  args <- commandArgs(trailingOnly = TRUE)

  # 解析参数
  input_dir <- Sys.getenv("INPUT_DIR", "inputs")
  output_dir <- Sys.getenv("OUTPUT_DIR", "outputs")
  param_file <- Sys.getenv("PARAM_FILE", "parameters.json")

  # 创建模型实例
  model <- {{class_name}}$new()

  # 加载参数
  if (file.exists(param_file)) {
    params <- fromJSON(param_file)
    do.call(model$set_parameters, params)
  }

  # 加载输入
  # TODO: 根据实际需求加载输入文件

  # 运行模型
  model$run()

  # 保存输出
  model$save_outputs(output_dir)
}

# 如果直接运行此脚本
if (!interactive()) {
  main()
}