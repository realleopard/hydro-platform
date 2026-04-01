package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.TaskNode;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.UUID;

/**
 * 任务节点执行详情 Mapper
 */
@Mapper
public interface TaskNodeMapper extends BaseMapper<TaskNode> {

    /**
     * 根据任务ID查询节点执行列表
     */
    @Select("SELECT * FROM task_nodes WHERE task_id = #{taskId} AND deleted_at IS NULL ORDER BY execution_order, created_at")
    List<TaskNode> selectByTaskId(@Param("taskId") UUID taskId);

    /**
     * 根据任务ID和节点ID查询
     */
    @Select("SELECT * FROM task_nodes WHERE task_id = #{taskId} AND node_id = #{nodeId} AND deleted_at IS NULL")
    TaskNode selectByTaskIdAndNodeId(@Param("taskId") UUID taskId, @Param("nodeId") String nodeId);

    /**
     * 查询正在运行的节点
     */
    @Select("SELECT * FROM task_nodes WHERE task_id = #{taskId} AND status = 'running' AND deleted_at IS NULL")
    List<TaskNode> selectRunningNodes(@Param("taskId") UUID taskId);

    /**
     * 更新节点状态
     */
    @Update("UPDATE task_nodes SET status = #{status}, updated_at = NOW() WHERE id = #{id}")
    int updateStatus(@Param("id") UUID id, @Param("status") String status);

    /**
     * 更新节点进度
     */
    @Update("UPDATE task_nodes SET progress = #{progress}, updated_at = NOW() WHERE id = #{id}")
    int updateProgress(@Param("id") UUID id, @Param("progress") Integer progress);

    /**
     * 追加日志
     */
    @Update("UPDATE task_nodes SET logs = CONCAT(COALESCE(logs, ''), #{logContent}), updated_at = NOW() WHERE id = #{id}")
    int appendLog(@Param("id") UUID id, @Param("logContent") String logContent);

    /**
     * 统计任务中各状态的节点数量
     */
    @Select("SELECT status, COUNT(*) as count FROM task_nodes WHERE task_id = #{taskId} AND deleted_at IS NULL GROUP BY status")
    List<java.util.HashMap<String, Object>> countByStatus(@Param("taskId") UUID taskId);
}
