import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Select,
  Divider,
  message,
  Drawer,
  Tag,
  Tooltip,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { api } from "../api";
import { useAuth } from "../auth";

const DEFAULT_OPTIONS = [
  { label: "没有", score: 1 },
  { label: "偶尔", score: 2 },
  { label: "经常", score: 3 },
  { label: "总是", score: 4 },
];

export default function Scales() {
  const { has } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [form] = Form.useForm();

  const load = () => api.get("/scales").then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, []);

  const view = async (id: number) => {
    const { data } = await api.get(`/scales/${id}`);
    setDetail(data);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const factors = (v.factors || []).map((f: any) => ({
      key: f.key,
      name: f.name,
    }));
    const questions = (v.questions || []).map((q: any, i: number) => ({
      order: i + 1,
      text: q.text,
      factor: q.factor,
      options: DEFAULT_OPTIONS,
    }));
    const crisis_rules = (v.crisis_rules || []).map((c: any) => ({
      factor: c.factor,
      op: ">=",
      threshold: Number(c.threshold),
      level: c.level,
    }));
    try {
      await api.post("/scales", {
        name: v.name,
        description: v.description || "",
        instructions: v.instructions || "",
        factors,
        crisis_rules,
        questions,
      });
      message.success("量表已创建");
      setOpen(false);
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "创建失败");
    }
  };

  return (
    <div>
      <h2 className="page-title">量表库</h2>
      <Card
        extra={
          has("add_scales") ? (
            <Button type="primary" onClick={() => setOpen(true)}>
              新增量表
            </Button>
          ) : (
            <Tooltip title="需要“新增量表”权限">
              <Button disabled>新增量表</Button>
            </Tooltip>
          )
        }
      >
        <Table
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: "量表名称", dataIndex: "name" },
            { title: "说明", dataIndex: "description", ellipsis: true },
            { title: "题目数", dataIndex: "question_count" },
            {
              title: "因子",
              dataIndex: "factors",
              render: (fs: any[]) => (
                <>
                  {(fs || []).map((f) => (
                    <Tag key={f.key}>{f.name}</Tag>
                  ))}
                </>
              ),
            },
            {
              title: "操作",
              render: (_, r) => (
                <Button type="link" onClick={() => view(r.id)}>
                  查看
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="新增量表"
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        width={760}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="量表名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider orientation="left">因子定义</Divider>
          <Form.List name="factors">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline">
                    <Form.Item
                      {...field}
                      name={[field.name, "key"]}
                      rules={[{ required: true, message: "因子标识(英文)" }]}
                    >
                      <Input placeholder="标识 如 depression" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "name"]}
                      rules={[{ required: true, message: "因子名称" }]}
                    >
                      <Input placeholder="名称 如 抑郁" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加因子
                </Button>
              </>
            )}
          </Form.List>

          <Divider orientation="left">题目（统一使用 4 级评分：没有/偶尔/经常/总是）</Divider>
          <Form.List name="questions">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: "flex" }}>
                    <Form.Item
                      {...field}
                      name={[field.name, "text"]}
                      rules={[{ required: true, message: "题干" }]}
                      style={{ width: 420 }}
                    >
                      <Input placeholder="题干" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "factor"]}
                      rules={[{ required: true, message: "所属因子" }]}
                    >
                      <Form.Item noStyle shouldUpdate>
                        {() => (
                          <Select
                            style={{ width: 140 }}
                            placeholder="因子"
                            options={(form.getFieldValue("factors") || [])
                              .filter((f: any) => f?.key)
                              .map((f: any) => ({ value: f.key, label: f.name }))}
                          />
                        )}
                      </Form.Item>
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加题目
                </Button>
              </>
            )}
          </Form.List>

          <Divider orientation="left">危机预警规则（因子均分 ≥ 阈值 时触发）</Divider>
          <Form.List name="crisis_rules">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline">
                    <Form.Item {...field} name={[field.name, "factor"]}>
                      <Select
                        style={{ width: 140 }}
                        placeholder="因子"
                        options={(form.getFieldValue("factors") || [])
                          .filter((f: any) => f?.key)
                          .map((f: any) => ({ value: f.key, label: f.name }))}
                      />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, "threshold"]}>
                      <Input placeholder="阈值 如 3" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, "level"]}>
                      <Select
                        style={{ width: 120 }}
                        placeholder="等级"
                        options={[
                          { value: "low", label: "轻度关注" },
                          { value: "medium", label: "中度预警" },
                          { value: "high", label: "高度预警" },
                        ]}
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  添加规则
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Drawer
        title={detail?.name}
        open={!!detail}
        onClose={() => setDetail(null)}
        width={560}
      >
        <p>{detail?.description}</p>
        <Divider>题目</Divider>
        {detail?.questions?.map((q: any) => (
          <div key={q.id} style={{ marginBottom: 8 }}>
            {q.order}. {q.text}{" "}
            <Tag>{(detail.factors.find((f: any) => f.key === q.factor) || {}).name}</Tag>
          </div>
        ))}
      </Drawer>
    </div>
  );
}
