import {
  Button,
  Card,
  Form,
  Input,
  message,
  Typography,
  Modal,
  Select,
} from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { api } from "../api";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [regForm] = Form.useForm();
  const [depts, setDepts] = useState<any[]>([]);

  const onFinish = async (v: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(v.username, v.password);
      nav("/overview");
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const openRegister = () => {
    setRegOpen(true);
    if (depts.length === 0)
      api.get("/departments/public").then((r) => setDepts(r.data)).catch(() => {});
  };

  const submitRegister = async () => {
    const v = await regForm.validateFields();
    try {
      const { data } = await api.post("/auth/register", {
        student_no: v.student_no,
        password: v.password,
        full_name: v.full_name || "",
        role: v.role,
        gender: v.gender || "",
        birth_date: v.birth_date || "",
        department_id: v.department_id ?? null,
      });
      localStorage.setItem("token", data.access_token);
      message.success("注册成功，正在进入平台");
      window.location.href = "/overview";
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "注册失败");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg,#2f6bff22,#2f6bff05)",
      }}
    >
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: "center" }}>
          心理测评平台
        </Typography.Title>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="username" label="用户名 / 学号" rules={[{ required: true }]}>
            <Input size="large" placeholder="用户名或学号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password size="large" placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            登录
          </Button>
        </Form>
        <Button type="link" block onClick={openRegister} style={{ marginTop: 8 }}>
          使用学号注册（咨询师 / 学员）
        </Button>
        <Typography.Paragraph
          type="secondary"
          style={{ marginTop: 8, fontSize: 12, marginBottom: 0 }}
        >
          演示账号：admin / admin123（管理员），counselor / counselor123（咨询师），
          student1 / student123（学员）
        </Typography.Paragraph>
      </Card>

      <Modal
        title="使用学号注册"
        open={regOpen}
        onOk={submitRegister}
        onCancel={() => setRegOpen(false)}
        okText="注册"
      >
        <Form form={regForm} layout="vertical" initialValues={{ role: "student" }}>
          <Form.Item name="student_no" label="学号" rules={[{ required: true }]}>
            <Input placeholder="学号将作为登录账号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="full_name" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="身份" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "student", label: "学员" },
                { value: "counselor", label: "咨询师/教师" },
              ]}
            />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select
              allowClear
              options={[
                { value: "男", label: "男" },
                { value: "女", label: "女" },
              ]}
            />
          </Form.Item>
          <Form.Item name="birth_date" label="出生日期">
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="department_id" label="所属部门/班级">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="选择部门/班级"
              options={depts.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
