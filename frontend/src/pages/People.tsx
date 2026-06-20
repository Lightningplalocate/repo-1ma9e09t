import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Tree,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Space,
  Tag,
  message,
  Popconfirm,
  TreeSelect,
  Drawer,
  Upload,
  Alert,
} from "antd";
import { PlusOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api, downloadFile, Meta, CRISIS_LABELS } from "../api";
import { useAuth } from "../auth";

function toTreeNodes(nodes: any[]): any[] {
  return nodes.map((n) => ({
    title: `${n.name}（${n.node_type === "class" ? "班级" : "部门"}·${n.user_count}人）`,
    key: n.id,
    raw: n,
    children: n.children ? toTreeNodes(n.children) : [],
  }));
}
function toTreeSelect(nodes: any[]): any[] {
  return nodes.map((n) => ({
    title: n.name,
    value: n.id,
    children: n.children ? toTreeSelect(n.children) : [],
  }));
}

export default function People() {
  const { has, user } = useAuth();
  const nav = useNavigate();
  const [tree, setTree] = useState<any[]>([]);
  const [treeRaw, setTreeRaw] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

  const [deptOpen, setDeptOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deptForm] = Form.useForm();
  const [userForm] = Form.useForm();

  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [reportDrawer, setReportDrawer] = useState(false);
  const [reportStudent, setReportStudent] = useState<any | null>(null);
  const [studentReports, setStudentReports] = useState<any[]>([]);

  const loadTree = async () => {
    const { data } = await api.get("/departments/tree");
    setTreeRaw(data);
    setTree(toTreeNodes(data));
  };
  const loadUsers = async (deptId: number | null) => {
    const { data } = await api.get("/users", {
      params: deptId ? { department_id: deptId } : {},
    });
    setUsers(data);
  };

  useEffect(() => {
    loadTree();
    loadUsers(null);
    api.get<Meta>("/auth/meta").then((r) => setMeta(r.data));
  }, []);

  const onSelectDept = (keys: any[]) => {
    const id = keys[0] ?? null;
    setSelected(id);
    loadUsers(id);
  };

  // ----- Department CRUD -----
  const submitDept = async () => {
    const v = await deptForm.validateFields();
    await api.post("/departments", {
      name: v.name,
      node_type: v.node_type,
      parent_id: v.parent_id ?? null,
    });
    message.success("已添加");
    setDeptOpen(false);
    deptForm.resetFields();
    loadTree();
  };
  const deleteDept = async (id: number) => {
    try {
      await api.delete(`/departments/${id}`);
      message.success("已删除");
      loadTree();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "删除失败");
    }
  };

  // ----- User create/edit -----
  const openCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    userForm.setFieldsValue({
      role: "student",
      department_id: selected,
      permissions: meta?.default_role_permissions["student"] || [],
    });
    setUserOpen(true);
  };
  const openEditUser = (u: any) => {
    setEditingUser(u);
    userForm.setFieldsValue({
      full_name: u.full_name,
      student_no: u.student_no,
      gender: u.gender,
      birth_date: u.birth_date,
      role: u.role,
      department_id: u.department_id,
      permissions: u.permissions,
    });
    setUserOpen(true);
  };
  const onRoleChange = (role: string) => {
    userForm.setFieldsValue({
      permissions: meta?.default_role_permissions[role] || [],
    });
  };
  const submitUser = async () => {
    const v = await userForm.validateFields();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          full_name: v.full_name,
          student_no: v.student_no,
          gender: v.gender,
          birth_date: v.birth_date,
          role: v.role,
          department_id: v.department_id,
          permissions: v.permissions,
          ...(v.password ? { password: v.password } : {}),
        });
        message.success("已更新");
      } else {
        await api.post("/users", {
          username: v.username,
          password: v.password,
          full_name: v.full_name,
          student_no: v.student_no,
          gender: v.gender,
          birth_date: v.birth_date,
          role: v.role,
          department_id: v.department_id,
          permissions: v.permissions,
        });
        message.success("已新增");
      }
      setUserOpen(false);
      userForm.resetFields();
      loadUsers(selected);
      loadTree();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "保存失败");
    }
  };

  // 批量导入
  const doImport = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/users/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(data);
      message.success(`导入完成，成功 ${data.created} 条`);
      loadUsers(selected);
      loadTree();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "导入失败");
    }
    return false;
  };

  // 查看学员历史报告
  const openReports = async (u: any) => {
    setReportStudent(u);
    setReportDrawer(true);
    try {
      const { data } = await api.get(`/users/${u.id}/reports`);
      setStudentReports(data);
    } catch {
      setStudentReports([]);
    }
  };
  const disableUser = async (id: number) => {
    await api.delete(`/users/${id}`);
    message.success("已禁用");
    loadUsers(selected);
  };

  const canManageDept = has("manage_departments");
  const isCounselor = user?.role === "counselor";
  const canManageUser = has("manage_users") || isCounselor;
  const canImport = has("manage_users") || isCounselor;
  const roleLabel: Record<string, string> = {
    admin: "管理员",
    counselor: "咨询师/教师",
    student: "学员",
  };

  return (
    <div>
      <h2 className="page-title">部门与人员档案管理</h2>
      <Row gutter={16}>
        <Col span={7}>
          <Card
            title="组织架构（部门/班级，多级）"
            size="small"
            extra={
              canManageDept && (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    deptForm.resetFields();
                    deptForm.setFieldsValue({ node_type: "department" });
                    setDeptOpen(true);
                  }}
                >
                  新建
                </Button>
              )
            }
          >
            <Tree
              treeData={tree}
              defaultExpandAll
              onSelect={onSelectDept}
              titleRender={(node: any) => (
                <Space>
                  <span>{node.title}</span>
                  {canManageDept && (
                    <Popconfirm
                      title="确认删除该部门？"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        deleteDept(node.key);
                      }}
                    >
                      <a
                        style={{ color: "#f5222d", fontSize: 12 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        删除
                      </a>
                    </Popconfirm>
                  )}
                </Space>
              )}
            />
          </Card>
        </Col>
        <Col span={17}>
          <Card
            title={
              selected
                ? "成员列表（所选部门）"
                : "成员列表（全部，可在左侧选择部门筛选）"
            }
            size="small"
            extra={
              <Space>
                {canImport && (
                  <Button
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={() => {
                      setImportResult(null);
                      setImportOpen(true);
                    }}
                  >
                    批量导入
                  </Button>
                )}
                {canManageUser && (
                  <Button type="primary" size="small" onClick={openCreateUser}>
                    新增人员
                  </Button>
                )}
              </Space>
            }
          >
            <Table
              rowKey="id"
              size="small"
              dataSource={users}
              columns={[
                { title: "用户名", dataIndex: "username" },
                {
                  title: "姓名",
                  dataIndex: "full_name",
                  render: (v, u: any) =>
                    u.role === "student" ? (
                      <a onClick={() => openReports(u)}>{v || "-"}</a>
                    ) : (
                      v || "-"
                    ),
                },
                { title: "学号", dataIndex: "student_no", render: (v) => v || "-" },
                { title: "性别", dataIndex: "gender", render: (v) => v || "-" },
                {
                  title: "出生日期",
                  dataIndex: "birth_date",
                  render: (v) => v || "-",
                },
                {
                  title: "角色",
                  dataIndex: "role",
                  render: (r) => <Tag>{roleLabel[r]}</Tag>,
                },
                { title: "所属部门", dataIndex: "department_name" },
                {
                  title: "已授予功能",
                  dataIndex: "permissions",
                  render: (perms: string[]) => (
                    <>
                      {(perms || []).map((p) => {
                        const m = meta?.permissions.find((x) => x.key === p);
                        return <Tag key={p}>{m?.label || p}</Tag>;
                      })}
                    </>
                  ),
                },
                {
                  title: "状态",
                  dataIndex: "is_active",
                  render: (a) =>
                    a ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
                },
                {
                  title: "操作",
                  render: (_, u) => (
                    <Space>
                      {u.role === "student" && (
                        <a onClick={() => openReports(u)}>查看报告</a>
                      )}
                      {canManageUser && (
                        <a onClick={() => openEditUser(u)}>编辑</a>
                      )}
                      {has("manage_users") && (
                        <Popconfirm
                          title="禁用该账号？"
                          onConfirm={() => disableUser(u.id)}
                        >
                          <a style={{ color: "#f5222d" }}>禁用</a>
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Department modal */}
      <Modal
        title="新建部门 / 班级"
        open={deptOpen}
        onOk={submitDept}
        onCancel={() => setDeptOpen(false)}
      >
        <Form form={deptForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="node_type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "department", label: "部门" },
                { value: "class", label: "班级" },
              ]}
            />
          </Form.Item>
          <Form.Item name="parent_id" label="上级（留空为顶级）">
            <TreeSelect
              treeData={toTreeSelect(treeRaw)}
              treeDefaultExpandAll
              allowClear
              placeholder="选择上级部门"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* User modal */}
      <Modal
        title={editingUser ? "编辑人员 / 权限" : "新增人员"}
        open={userOpen}
        onOk={submitUser}
        onCancel={() => setUserOpen(false)}
        width={620}
      >
        <Form form={userForm} layout="vertical">
          {!editingUser && (
            <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item
            name="password"
            label={editingUser ? "重置密码（留空不修改）" : "初始密码"}
            rules={editingUser ? [] : [{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="full_name" label="姓名">
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="student_no" label="学号">
                <Input placeholder="学号（与报告同步）" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="gender" label="性别">
                <Select
                  allowClear
                  placeholder="请选择"
                  options={[
                    { value: "男", label: "男" },
                    { value: "女", label: "女" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="birth_date" label="出生日期">
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="role" label="角色（多级管理）" rules={[{ required: true }]}>
            <Select
              onChange={onRoleChange}
              options={(meta?.roles || []).map((r) => ({
                value: r.key,
                label: r.label,
              }))}
            />
          </Form.Item>
          <Form.Item name="department_id" label="所属部门/班级（可挪动）">
            <TreeSelect
              treeData={toTreeSelect(treeRaw)}
              treeDefaultExpandAll
              allowClear
              placeholder="选择部门/班级"
            />
          </Form.Item>
          {has("manage_users") && (
            <Form.Item name="permissions" label="授予功能权限（勾选）">
              <Checkbox.Group>
                <Row>
                  {(meta?.permissions || []).map((p) => (
                    <Col span={12} key={p.key} style={{ marginBottom: 8 }}>
                      <Checkbox value={p.key}>{p.label}</Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 批量导入 modal */}
      <Modal
        title="批量导入学员"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        footer={null}
        width={620}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="步骤：1) 下载 Excel 模板 → 2) 按列填写（学号、姓名、性别、出生日期、部门/班级名称、初始密码）→ 3) 上传文件。部门/班级名称需与系统内名称一致。"
        />
        <Space style={{ marginBottom: 16 }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              downloadFile("/users/import/template", "学员导入模板.xlsx")
            }
          >
            下载 Excel 模板
          </Button>
          <Upload
            accept=".xlsx"
            showUploadList={false}
            beforeUpload={(file) => doImport(file as File)}
          >
            <Button type="primary" icon={<UploadOutlined />}>
              上传并导入
            </Button>
          </Upload>
        </Space>
        {importResult && (
          <div>
            <p>
              成功导入 <b>{importResult.created}</b> 条
              {importResult.errors?.length
                ? `，${importResult.errors.length} 条未导入：`
                : "。"}
            </p>
            {importResult.errors?.length > 0 && (
              <ul style={{ color: "#f5222d", maxHeight: 200, overflow: "auto" }}>
                {importResult.errors.map((er: string, i: number) => (
                  <li key={i}>{er}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      {/* 学员历史报告 drawer */}
      <Drawer
        title={`${reportStudent?.full_name || ""} 的测评报告历史`}
        open={reportDrawer}
        onClose={() => setReportDrawer(false)}
        width={640}
      >
        <Table
          rowKey="id"
          size="small"
          dataSource={studentReports}
          pagination={false}
          columns={[
            { title: "量表", dataIndex: "scale_name" },
            { title: "总分", dataIndex: "total_score" },
            {
              title: "风险等级",
              dataIndex: "crisis_level",
              render: (v) => CRISIS_LABELS[v] || v,
            },
            {
              title: "提交时间",
              dataIndex: "submitted_at",
              render: (v) => new Date(v).toLocaleString("zh-CN"),
            },
            {
              title: "操作",
              render: (_, r: any) => (
                <a onClick={() => nav(`/reports/${r.id}`)}>查看</a>
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  );
}
