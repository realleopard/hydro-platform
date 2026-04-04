-- Seed: Multi-node conditional branch workflow
-- Uses existing models from V3 seed data

DO $$
DECLARE
    scs_cn_id UUID;
    muskingum_id UUID;
    penman_id UUID;
    freq_id UUID;
    workflow_id UUID;
    admin_id UUID;
BEGIN
    -- Find model IDs by docker image name
    SELECT id INTO scs_cn_id FROM models WHERE docker_image = 'alpine:latest' LIMIT 1;
    SELECT id INTO muskingum_id FROM models WHERE docker_image = 'watershed/muskingum:v1.0.0' LIMIT 1;
    SELECT id INTO penman_id FROM models WHERE docker_image = 'watershed/penman-monteith:v1.0.0' LIMIT 1;
    SELECT id INTO freq_id FROM models WHERE docker_image = 'watershed/frequency-analysis:v1.0.0' LIMIT 1;

    -- Get admin user
    SELECT id INTO admin_id FROM users WHERE username = 'admin' LIMIT 1;

    -- Only create if we have the required models
    IF scs_cn_id IS NULL THEN
        RAISE NOTICE 'Skipping conditional workflow seed: required models not found';
        RETURN;
    END IF;

    -- Use alpine for all nodes if specific model images aren't available
    IF muskingum_id IS NULL THEN muskingum_id := scs_cn_id; END IF;
    IF penman_id IS NULL THEN penman_id := scs_cn_id; END IF;
    IF freq_id IS NULL THEN freq_id := scs_cn_id; END IF;

    workflow_id := gen_random_uuid();

    INSERT INTO workflows (id, name, description, owner_id, definition, status, run_count, is_public, created_at, updated_at)
    VALUES (
        workflow_id,
        '条件分支工作流',
        '演示条件分支的多节点工作流：根据SCS-CN计算结果自动选择不同路径',
        admin_id,
        jsonb_build_object(
            'nodes', jsonb_build_array(
                jsonb_build_object('id', 'node-a', 'type', 'model', 'name', 'SCS-CN降雨径流', 'modelId', scs_cn_id::text,
                    'position', jsonb_build_object('x', 100, 'y', 200)),
                jsonb_build_object('id', 'node-b', 'type', 'model', 'name', 'Muskingum洪水演进', 'modelId', muskingum_id::text,
                    'position', jsonb_build_object('x', 500, 'y', 100)),
                jsonb_build_object('id', 'node-c', 'type', 'model', 'name', 'Penman-Monteith蒸散发', 'modelId', penman_id::text,
                    'position', jsonb_build_object('x', 500, 'y', 350)),
                jsonb_build_object('id', 'node-d', 'type', 'model', 'name', '水文频率分析', 'modelId', freq_id::text,
                    'position', jsonb_build_object('x', 900, 'y', 200))
            ),
            'edges', jsonb_build_array(
                jsonb_build_object('id', 'edge-ab', 'source', 'node-a', 'target', 'node-b',
                    'condition', 'output.exitCode == 0',
                    'dataMapping', jsonb_build_object('inflow', 'exitCode')),
                jsonb_build_object('id', 'edge-ac', 'source', 'node-a', 'target', 'node-c',
                    'condition', 'output.exitCode != 0',
                    'dataMapping', jsonb_build_object('temperature', 'exitCode')),
                jsonb_build_object('id', 'edge-bd', 'source', 'node-b', 'target', 'node-d',
                    'dataMapping', jsonb_build_object('annual_maxima', 'exitCode')),
                jsonb_build_object('id', 'edge-cd', 'source', 'node-c', 'target', 'node-d',
                    'dataMapping', jsonb_build_object('annual_maxima', 'exitCode'))
            )
        ),
        'active',
        0,
        true,
        NOW(),
        NOW()
    );
END
$$;
