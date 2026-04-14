#!/bin/bash

# 获取所有远程分支，排除main和HEAD
remote_branches=$(git ls-remote --heads origin | grep -v 'refs/heads/main' | grep -v 'refs/heads/HEAD' | cut -f 2)

# 遍历并删除每个分支
for branch in $remote_branches; do
    # 提取分支名（去掉refs/heads/前缀）
    branch_name=$(echo $branch | sed 's/refs\/heads\///')
    echo "Deleting remote branch: $branch_name"
    git push origin --delete $branch_name
done

echo "All non-main remote branches have been deleted."
