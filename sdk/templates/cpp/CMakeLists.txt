cmake_minimum_required(VERSION 3.14)
project({{model_name}} VERSION {{version}} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找依赖
find_package(nlohmann_json REQUIRED)
find_package(netCDF-CXX4 REQUIRED)

# 源文件
set(SOURCES
    src/main.cpp
    src/model.cpp
    src/io.cpp
    src/utils.cpp
)

# 头文件
set(HEADERS
    include/model.h
    include/io.h
    include/utils.h
)

# 创建可执行文件
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# 包含目录
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# 链接库
target_link_libraries(${PROJECT_NAME} PRIVATE
    nlohmann_json::nlohmann_json
    netcdf-cxx4
)

# 安装规则
install(TARGETS ${PROJECT_NAME} DESTINATION bin)
install(FILES config.json DESTINATION etc)
