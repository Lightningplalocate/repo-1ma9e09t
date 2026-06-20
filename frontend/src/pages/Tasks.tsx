import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  TreeSelect,
  Progress,
  message,
} from "antd";
import { api } from "../api";

interface Task {
  id: number;
  title: string;
  scale_name: string;
  target_type: string;
  target_department_name?: string;
  total_count: number;
  completed_count: number;
  created_at: string;
}

function buildTreeData(nodes: any[]): any[] {
  return nodes.map((n) => ({
    title: `${n.name}（${n.node_type === "class" ? "班级" : "部门"}）`,
    value: n.id,
    children: n.children ? buildTreeData(n.children) : [],
  }));
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scales, setScales] = useState<any[]>([]);
  const [tree, setTree] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = () => api.get("/tasks").then((r) => setTasks(r.data));

  useEffect(() => {
    load();
    api.get("/scales").then((r) => setScales(r.data));
    api.get("/departments/tree").then((r) => setTree(buildTreeData(r.data)));
  }, []);

  const submit = async () => {
    const v = await form.validateFields();
    try {
      await api.post("/tasks", {
        title: v.title,
        scale_id: v.scale_id,
        target_type: "department",
        target_department_id: v.target_department_id,
      });
      message.success("任务已按班级/部门批量发放");
      setOpen(false);
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "创建失败");
    }
  };

  return (
    <div>
      <h2 className="page-title">测评任务</h2>
      <Card
        extra={
          <Button type="primary" onClick={() => setOpen(true)}>
            新建测评任务
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={tasks}
          columns={[
            { title: "任务名称", dataIndex: "title" },
            { title: "量表", dataIndex: "scale_name" },
            {
              title: "发放对象",
              render: (_, r) =>
                r.target_department_name
                  ? `${r.target_department_name}（按部门/班级）`
                  : "指定人员",
            },
            {
              title: "完成进度",
              render: (_, r) => (
                <Progress
                  percent={
                    r.total_count
                      ? Math.round((r.completed_count / r.total_count) * 100)
                      : 0
                  }
                  format={() => `${r.completed_count}/${r.total_count}`}
                  style={{ width: 160 }}
                />
              ),
            },
            {
              title: "创建时间",
              dataIndex: "created_at",
              render: (v) => new Date(v).toLocaleString("zh-CN"),
            },
          ]}
        />
      </Card>

      <Modal
        title="新建测评任务"
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText="发放"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="如：2026春季心理普测" />
          </Form.Item>
          <Form.Item name="scale_id" label="选择量表" rules={[{ required: true }]}>
            <Select
              options={scales.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="请选择量表"
            />
          </Form.Item>
          <Form.Item
            name="target_department_id"
            label="发放对象（以班级/部门为单位，向其下所有学员账号发放）"
            rules={[{ required: true }]}
          >
            <TreeSelect
              treeData={tree}
              treeDefaultExpandAll
              placeholder="选择班级或部门"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
