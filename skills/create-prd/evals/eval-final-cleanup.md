# Eval: Final Front Matter Cleanup

## Purpose

验证 PRD 生成完成后，front matter 是否被正确清理。

## Test Scenario

1. 使用 coaching 模式生成完整 PRD
2. 等待所有 5 个 batch 完成
3. 运行 validate-prd.js 验证
4. 检查最终 PRD 文件

## Expected Results

### 生成过程中
- [ ] PRD 文件包含 `generate_progress` checkpoint
- [ ] checkpoint 状态随 batch 完成而更新

### 生成完成后
- [ ] PRD 文件不含任何 YAML front matter
- [ ] Metadata 表完整存在（8 个字段）
- [ ] validate-prd.js 第 15 项检查通过（无 front matter）
- [ ] validate-prd.js 第 18 项检查通过（Metadata 表完整）

## Validation Commands

```bash
# 检查 front matter 是否存在
grep -c "^---$" prd-file.md  # 应返回 0

# 检查 Metadata 表
grep -c "## Metadata" prd-file.md  # 应返回 1

# 运行验证脚本
node scripts/validate-prd.js prd-file.md
```

## Success Criteria

- ✅ 生成过程中 checkpoint 正常工作
- ✅ 生成完成后 front matter 被清理
- ✅ Metadata 表作为唯一权威源
- ✅ validate-prd.js 所有检查通过
